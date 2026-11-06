import io

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from schemas.tabular_schemas import AuditRequest, AuditResponse, FileUploadResponse
from services.schema_service import infer_schema
from services.tabular_service import compute_tabular_audit
from storage import get_file_bytes, store_file_bytes

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_csv(file: UploadFile = File(...)) -> FileUploadResponse:
    """Accepts a CSV upload and stores file bytes in memory keyed by a UUID."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv files are accepted.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    file_id = store_file_bytes(content)

    # ML-driven schema auto-detection: profile the first 1000 rows to guess
    # the text and label columns so the frontend can pre-select them. This is
    # best effort — an inference failure must never fail the upload itself.
    inferred_text_column = None
    inferred_label_column = None
    columns: list[str] = []
    try:
        df_head = pd.read_csv(io.BytesIO(content), nrows=1000)
        columns = [str(c) for c in df_head.columns]
        schema_guess = infer_schema(df_head)
        inferred_text_column = schema_guess["inferred_text_column"]
        inferred_label_column = schema_guess["inferred_label_column"]
    except Exception as exc:
        logger.warning("Schema auto-detection failed for upload: %s", exc)

    return FileUploadResponse(
        file_id=file_id,
        columns=columns,
        inferred_text_column=inferred_text_column,
        inferred_label_column=inferred_label_column,
    )


@router.post("/audit", response_model=AuditResponse)
async def audit_tabular(request: AuditRequest) -> AuditResponse:
    """Loads the stored CSV bytes by file_id, validates the label column, and returns audit metrics."""
    file_bytes = get_file_bytes(request.file_id)
    if file_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV file: {exc}",
        )

    if request.label_column not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label column '{request.label_column}' not found.",
        )

    audit_result = compute_tabular_audit(request.file_id, df, request.label_column)
    return AuditResponse(**audit_result)
