from __future__ import annotations

from typing import Any, Dict, List, Optional

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


class IssueItem(BaseModel):
    category: str        # e.g. "Label Noise", "Class Imbalance", "Missing Values"
    severity: str        # exactly one of: "CRITICAL", "WARNING", "INFO"
    description: str     # human-readable explanation
    fix_suggestion: str  # concrete actionable fix


class AugmentationStrategy(BaseModel):
    strategy_name: str   # e.g. "Oversample minority class", "Text Synonym Replacement"
    target_issue: str    # which issue this addresses
    method: str          # e.g. "SMOTE", "Random Oversampling", "NLPAug / Synonym Replacement"
    priority: int        # 1 = highest priority


class FullAuditRequest(BaseModel):
    file_id: str
    label_column: str
    text_column: Optional[str] = None
    # text_column is optional — if None, we skip text NLP audit sequences


class HealthScoreReport(BaseModel):
    file_id: str
    overall_score: float                  # 0.0 to 100.0, rounded to 2 decimals
    score_breakdown: dict[str, float]
    # e.g. {"missing_values": 95.0, "class_balance": 60.0, "label_noise": 85.0}
    grade: str                            # "A" (>=90), "B" (>=75), "C" (>=60), "D" (<60)
    issues: list[IssueItem]               # sorted by severity: CRITICAL first
    augmentation_strategies: list[AugmentationStrategy]
    tabular_summary: dict                 # raw tabular audit JSON payload details
    text_summary: Optional[dict] = None   # None if no text_column was assigned or analyzed
