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


class TextInconsistency(BaseModel):
    idx_1: int
    idx_2: int
    text_1: str
    text_2: str
    label_1: str
    label_2: str
    similarity: float


class LabelNoiseIssue(BaseModel):
    idx: int
    text: str
    given_label: str
    suggested_label: str
    label_quality: float


class SpuriousToken(BaseModel):
    token: str
    correlation_score: float


class TextAuditRequest(BaseModel):
    file_id: str
    text_column: str
    label_column: str


class TextAuditResponse(BaseModel):
    file_id: str
    text_column: str
    label_column: str
    row_count: int
    semantic_inconsistencies: list[TextInconsistency]
    label_noise_issues: list[LabelNoiseIssue]
    spurious_correlations: dict[str, list[SpuriousToken]]
    inconsistency_count: int
    noise_issue_count: int
    health_hints: list[str]
