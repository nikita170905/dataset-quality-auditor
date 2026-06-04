from __future__ import annotations

from typing import Any, Dict
import numpy as np
import pandas as pd


def compute_tabular_audit(file_id: str, df: pd.DataFrame, label_column: str) -> Dict[str, Any]:
    """Compute tabular audit metrics for the provided DataFrame."""
    # Ensure any trailing/leading whitespaces in string columns don't mess up calculations
    df = df.copy()
    
    # Standardize string representations of empty values to actual NaN
    df = df.replace(r'^\s*$', np.nan, regex=True)

    row_count = len(df)
    column_count = len(df.columns)
    class_distribution = _compute_class_distribution(df, label_column)
    imbalance_ratio = _compute_imbalance_ratio(class_distribution)
    duplicate_rows = _compute_duplicate_rows(df)
    missing_values = _compute_missing_values(df)

    return {
        "file_id": file_id,
        "row_count": row_count,
        "column_count": column_count,
        "class_distribution": class_distribution,
        "imbalance_ratio": imbalance_ratio,
        "duplicate_rows": duplicate_rows,
        "missing_values": missing_values,
        "health_hints": [],
    }


def _compute_class_distribution(df: pd.DataFrame, label_column: str) -> Dict[str, int]:
    """Return the distribution of label values as a mapping of class to count."""
    distribution = df[label_column].value_counts(dropna=False)
    return {str(key): int(value) for key, value in distribution.items()}


def _compute_imbalance_ratio(class_distribution: Dict[str, int]) -> float:
    """Compute the ratio between the largest and smallest class counts."""
    if not class_distribution:
        return 0.0

    counts = [count for count in class_distribution.values() if count > 0]
    if not counts:
        return 0.0

    ratio = max(counts) / min(counts)
    return round(float(ratio), 2)


def _compute_duplicate_rows(df: pd.DataFrame) -> Dict[str, Any]:
    """Identify duplicated rows and return the duplicate count and clean row indices."""
    # Compute boolean series of duplicate rows matching your prompt guidelines
    duplicate_mask = df.duplicated(keep="first")
    
    # Get the precise 0-indexed row positioning to ensure it aligns perfectly with raw array parsing
    duplicated_positions = np.flatnonzero(duplicate_mask).tolist()
    
    return {
        "count": int(duplicate_mask.sum()),
        "indices": [int(pos) for pos in duplicated_positions],
    }


def _compute_missing_values(df: pd.DataFrame) -> Dict[str, float]:
    """Calculate the percentage of missing values for each column."""
    row_count = len(df)
    if row_count == 0:
        return {column: 0.0 for column in df.columns}

    missing_percentages = (df.isna().sum() / row_count) * 100
    return {column: round(float(missing_percentages[column]), 2) for column in df.columns}