from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    file_id: str


class AuditRequest(BaseModel):
    file_id: str
    label_column: str


class DuplicateRows(BaseModel):
    count: int
    indices: List[int]


class AuditResponse(BaseModel):
    file_id: str
    row_count: int
    column_count: int
    class_distribution: Dict[str, int]
    imbalance_ratio: float
    duplicate_rows: DuplicateRows
    missing_values: Dict[str, float]
    health_hints: List[str]
