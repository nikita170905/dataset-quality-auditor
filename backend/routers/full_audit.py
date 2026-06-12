from __future__ import annotations

import io
import json
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from schemas.tabular_schemas import (
    AugmentationStrategy,
    FullAuditRequest,
    HealthScoreReport,
    IssueItem,
)
from services.advisor import generate_augmentation_strategies, generate_issues
from services.scorer import compute_health_score
from services.tabular_service import compute_tabular_audit
from services.text_service import (
    detect_label_noise,
    detect_semantic_inconsistencies,
    detect_spurious_correlations,
)
from storage import get_file_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["Full Audit"])

# Configure dedicated background thread worker pool for CPU-bound tasks
executor = ThreadPoolExecutor(max_workers=3)


async def run_text_audits_parallel(df: pd.DataFrame, text_col: str, label_col: str) -> tuple[list, list, dict]:
    """Executes NLP and Cleanlab validation passes concurrently across separate worker threads.

    Args:
        df: The target pandas DataFrame.
        text_col: Name of the textual analysis column.
        label_col: Name of the assigned dataset category column.

    Returns:
        tuple: (semantic_inconsistencies, label_noise_issues, spurious_correlations)
    """
    loop = asyncio.get_event_loop()

    async def run(fn, *args):
        try:
            return await loop.run_in_executor(executor, fn, *args)
        except Exception as e:
            logger.error(f"Parallel streaming sub-task function {fn.__name__} failed: {e}", exc_info=True)
            return {} if fn.__name__ == "detect_spurious_correlations" else []

    results = await asyncio.gather(
        run(detect_semantic_inconsistencies, df, text_col, label_col),
        run(detect_label_noise, df, text_col, label_col),
        run(detect_spurious_correlations, df, text_col, label_col),
    )
    return results[0], results[1], results[2]


@router.post("/full", response_model=HealthScoreReport)
async def run_full_dataset_audit(request: FullAuditRequest) -> HealthScoreReport:
    """Orchestrates a synchronous end-to-end dataset quality evaluation pass using non-blocking thread workers.

    Args:
        request: FullAuditRequest containing file_id, label_column, and optional text_column.

    Returns:
        HealthScoreReport with aggregated tabular, text, score, issues and strategies.
    """
    file_bytes = get_file_bytes(request.file_id)
    if file_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found. Upload via POST /upload",
        )

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        logger.error("Failed to parse stored CSV bytes for file_id=%s: %s", request.file_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV file: {exc}",
        )

    if request.label_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"label_column '{request.label_column}' not found.",
        )

    try:
        tabular_result = compute_tabular_audit(request.file_id, df, request.label_column)
        if hasattr(tabular_result, "model_dump"):
            tabular_result = tabular_result.model_dump()
    except Exception as exc:
        logger.error("Tabular audit failed for file_id=%s: %s", request.file_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tabular audit failed: {str(exc)}",
        )

    text_result: Optional[dict] = None
    if request.text_column is not None:
        if request.text_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"text_column '{request.text_column}' not found.",
            )

        semantic_inconsistencies, label_noise_issues, spurious_correlations = \
            await run_text_audits_parallel(df, request.text_column, request.label_column)

        text_result = {
            "row_count": len(df),
            "text_column": request.text_column,
            "label_column": request.label_column,
            "semantic_inconsistencies": semantic_inconsistencies,
            "label_noise_issues": label_noise_issues,
            "spurious_correlations": spurious_correlations,
        }

    score_data = compute_health_score(tabular_result, text_result)
    issues_list = generate_issues(tabular_result, text_result, score_data["score_breakdown"])
    strategies_list = generate_augmentation_strategies(tabular_result, text_result, issues_list)

    return HealthScoreReport(
        file_id=request.file_id,
        overall_score=score_data["overall_score"],
        score_breakdown=score_data["score_breakdown"],
        grade=score_data["grade"],
        issues=[IssueItem(**issue) for issue in issues_list],
        augmentation_strategies=[AugmentationStrategy(**strategy) for strategy in strategies_list],
        tabular_summary=tabular_result,
        text_summary=text_result,
    )


@router.post("/full/stream")
async def audit_full_streaming(request: FullAuditRequest) -> StreamingResponse:
    """Orchestrates an end-to-end dataset quality evaluation pass by pushing

    real-time progress telemetry frames via Server-Sent Events (SSE).
    """
    async def event_stream():
        def send(stage: str, pct: int, message: str) -> str:
            payload = json.dumps({
                "stage": stage,
                "progress": pct,
                "message": message
            })
            return f"data: {payload}\n\n"

        yield send("upload", 5, "Loading dataset from session cache...")
        file_bytes = get_file_bytes(request.file_id)
        if not file_bytes:
            yield send("error", 0, "File not found. Upload via POST /upload")
            return

        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
        except Exception as exc:
            yield send("error", 0, f"Failed to parse CSV file: {str(exc)}")
            return

        if request.label_column not in df.columns:
            yield send("error", 0, f"label_column '{request.label_column}' not found.")
            return

        yield send("tabular", 20, "Running structural tabular audit validation arrays...")
        try:
            tabular_result = compute_tabular_audit(request.file_id, df, request.label_column)
            if hasattr(tabular_result, "model_dump"):
                tabular_result = tabular_result.model_dump()
        except Exception as exc:
            yield send("error", 0, f"Tabular audit failed: {str(exc)}")
            return

        yield send("tabular", 45, "Tabular audit complete safely.")
        text_result = None

        if request.text_column:
            if request.text_column not in df.columns:
                yield send("error", 0, f"text_column '{request.text_column}' not found.")
                return

            yield send("text", 50, "Launching parallel NLP worker threads (Inconsistencies, Noise, Correlations)...")
            
            try:
                # Maintain FIX 3 performance optimization within the stream loop
                semantic, noise, spurious = await run_text_audits_parallel(
                    df, request.text_column, request.label_column
                )
            except Exception as exc:
                logger.error(f"Parallel text streaming block encountered a fault: {exc}", exc_info=True)
                semantic, noise, spurious = [], [], {}

            text_result = {
                "row_count": len(df),
                "text_column": request.text_column,
                "label_column": request.label_column,
                "semantic_inconsistencies": semantic,
                "label_noise_issues": noise,
                "spurious_correlations": spurious
            }

        yield send("scoring", 90, "Assembling quality score breakdown metrics...")
        try:
            score_data = compute_health_score(tabular_result, text_result)
            issues = generate_issues(tabular_result, text_result, score_data["score_breakdown"])
            strategies = generate_augmentation_strategies(tabular_result, text_result, issues)

            # Package completely verified JSON-serializable diagnostic profile
            report = {
                **score_data,
                "file_id": request.file_id,
                "issues": issues,
                "augmentation_strategies": strategies,
                "tabular_summary": tabular_result,
                "text_summary": text_result,
                "health_hints": []
            }
        except Exception as exc:
            logger.error(f"Scoring/Advisor compilation inside event stream failed: {exc}", exc_info=True)
            yield send("error", 0, f"Report aggregation layer failed: {str(exc)}")
            return

        yield send("complete", 100, json.dumps(report))
        return

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )