from __future__ import annotations

import logging
from typing import Dict, Optional

import pandas as pd
from pandas.api.types import is_string_dtype

logger = logging.getLogger(__name__)

# A string column whose values average more than this many characters is
# treated as free prose and becomes a text-column candidate.
TEXT_MIN_AVG_LENGTH = 50.0

# Label columns are expected to be categorical: few distinct values, but at
# least two (a constant column carries no signal for classification).
LABEL_MAX_UNIQUE_VALUES = 10
LABEL_MIN_UNIQUE_VALUES = 2

# When several low-cardinality columns qualify as the label, names that look
# label-ish win the tie-break (e.g. "airline_sentiment" over "airline").
LABEL_NAME_HINTS = ("label", "target", "class", "sentiment", "category", "outcome",
                    "survived", "species", "churn", "fraud", "spam", "diagnosis")

def _average_string_length(series: pd.Series) -> float:
    """Mean character length of non-empty values; 0.0 when nothing survives."""
    values = series.dropna().astype(str)
    values = values[values.str.strip() != ""]
    if values.empty:
        return 0.0
    return float(values.str.len().mean())


def infer_schema(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """Profile a DataFrame and guess which columns are the text and label columns.

    Heuristics, using only pandas metadata:
      - Text column: among string-dtype columns, the one with the highest
        average value length, provided that average exceeds
        TEXT_MIN_AVG_LENGTH (short strings like labels or IDs never win).
      - Label column: any column with fewer than LABEL_MAX_UNIQUE_VALUES
        distinct values (and at least LABEL_MIN_UNIQUE_VALUES). When several
        columns qualify, string columns are prioritized over integer ones,
        and earlier columns win any remaining tie.

    Args:
        df: Profiling DataFrame (typically the first ~1000 uploaded rows).

    Returns:
        Dict with keys "inferred_text_column" and "inferred_label_column",
        each either a column name or None when no candidate matched.
    """
    result: Dict[str, Optional[str]] = {
        "inferred_text_column": None,
        "inferred_label_column": None,
    }
    if df is None or df.empty or df.columns.empty:
        return result

    # --- Text column: string columns ranked by average value length ---------
    text_candidates: list[tuple[str, float]] = []
    for col in df.columns:
        if not is_string_dtype(df[col]):
            continue
        avg_len = _average_string_length(df[col])
        if avg_len > TEXT_MIN_AVG_LENGTH:
            text_candidates.append((str(col), avg_len))
    if text_candidates:
        text_candidates.sort(key=lambda item: item[1], reverse=True)
        result["inferred_text_column"] = text_candidates[0][0]

    # --- Label column: low-cardinality columns, best tier wins --------------
    # Tier 0: string dtype AND a label-ish column name (label/target/class/...)
    # Tier 1: string dtype (spec: prioritize strings over integers)
    # Tier 2: non-string dtype AND a label-ish name (e.g. integer "target")
    # Tier 3: non-string dtype
    # The spec's string-over-integer priority always holds (tier 0/1 beat
    # tier 2/3); name hints only break ties within the same dtype group.
    # Earlier columns win any remaining tie within the same tier.
    label_candidates: list[tuple[int, int, str]] = []
    lowered_names = {str(col): str(col).lower() for col in df.columns}
    for position, col in enumerate(df.columns):
        if str(col) == result["inferred_text_column"]:
            continue
        try:
            unique_count = int(df[col].nunique())
        except Exception:  # unhashable or exotic cell values
            continue
        if not (LABEL_MIN_UNIQUE_VALUES <= unique_count < LABEL_MAX_UNIQUE_VALUES):
            continue
        name = lowered_names[str(col)]
        has_hint = any(hint in name for hint in LABEL_NAME_HINTS)
        if is_string_dtype(df[col]):
            tier = 0 if has_hint else 2
        else:
            tier = 1 if has_hint else 3
        label_candidates.append((tier, position, str(col)))
    if label_candidates:
        label_candidates.sort(key=lambda item: (item[0], item[1]))
        result["inferred_label_column"] = label_candidates[0][2]

    logger.info(
        "Schema auto-detection: text=%s label=%s",
        result["inferred_text_column"],
        result["inferred_label_column"],
    )
    return result
