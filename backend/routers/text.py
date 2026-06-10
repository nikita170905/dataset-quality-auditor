from __future__ import annotations

import io
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException, status

from schemas.tabular_schemas import TextAuditRequest, TextAuditResponse
from services.text_service import (
    detect_label_noise,
    detect_semantic_inconsistencies,
    detect_spurious_correlations,
)
from storage import get_file_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["Text Audit"])


@router.post("/text", response_model=TextAuditResponse)
async def audit_text(request: TextAuditRequest) -> TextAuditResponse:
    file_bytes = get_file_bytes(request.file_id)
    if file_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found. Upload the file first via POST /upload",
        )

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        logger.error("Failed to parse uploaded file bytes: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file could not be parsed as CSV: {exc}",
        )

    if request.text_column not in df.columns or request.label_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"[Target] column not found. Available dataset dimensions: {list(df.columns)}",
        )

    semantic_inconsistencies: list[dict] = []
    try:
        semantic_inconsistencies = detect_semantic_inconsistencies(
            df,
            request.text_column,
            request.label_column,
        )
    except Exception as exc:
        logger.error(
            "Semantic inconsistency detection failed for file_id=%s: %s",
            request.file_id,
            exc,
            exc_info=True,
        )
        semantic_inconsistencies = []

    label_noise_issues: list[dict] = []
    try:
        label_noise_issues = detect_label_noise(
            df,
            request.text_column,
            request.label_column,
        )
    except Exception as exc:
        logger.error(
            "Label noise detection failed for file_id=%s: %s",
            request.file_id,
            exc,
            exc_info=True,
        )
        label_noise_issues = []

    spurious_correlations: dict[str, list[dict]] = {}
    try:
        spurious_correlations = detect_spurious_correlations(
            df,
            request.text_column,
            request.label_column,
        )
    except Exception as exc:
        logger.error(
            "Spurious correlation detection failed for file_id=%s: %s",
            request.file_id,
            exc,
            exc_info=True,
        )
        spurious_correlations = {}

    response = TextAuditResponse(
        file_id=request.file_id,
        text_column=request.text_column,
        label_column=request.label_column,
        row_count=len(df),
        semantic_inconsistencies=semantic_inconsistencies,
        label_noise_issues=label_noise_issues,
        spurious_correlations=spurious_correlations,
        inconsistency_count=len(semantic_inconsistencies),
        noise_issue_count=len(label_noise_issues),
        health_hints=[],
    )

    return response
