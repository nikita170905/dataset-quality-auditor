from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def clamp(val: float, lo: float, hi: float) -> float:
    """Clamp a floating point value into a closed range [lo, hi]."""
    return max(lo, min(hi, val))


def compute_health_score(tabular_result: dict, text_result: dict | None) -> dict:
    """Compute bounded, weighted data quality sub-scores and map an overall percentage.

    This function applies deterministic penalty scales to tabular and optional
    text audit results, then returns normalized sub-scores and a grade.
    """

    missing_values = tabular_result.get("missing_values", {}) or {}
    vals = [float(v) for v in missing_values.values() if isinstance(v, (int, float, str)) and str(v).strip() != ""]
    avg_missing = sum(vals) / len(vals) if vals else 0.0
    penalty_missing = avg_missing * 0.20
    sub_score_missing = clamp(100.0 - avg_missing, 0.0, 100.0)

    ratio = tabular_result.get("imbalance_ratio")
    if ratio is None or ratio <= 1.5:
        penalty_balance = 0.0
    elif ratio <= 3.0:
        penalty_balance = 5.0
    elif ratio <= 5.0:
        penalty_balance = 12.0
    elif ratio <= 10.0:
        penalty_balance = 18.0
    else:
        penalty_balance = 20.0
    sub_score_balance = clamp(100.0 - (penalty_balance * 5.0), 0.0, 100.0)

    dup_count = int(tabular_result.get("duplicate_rows", {}).get("count", 0))
    row_count = int(tabular_result.get("row_count", 1))
    dup_fraction = dup_count / row_count if row_count > 0 else 0.0
    penalty_duplication = min(dup_fraction * 100.0 * 0.15, 15.0)
    sub_score_duplication = clamp(100.0 - (dup_fraction * 100.0), 0.0, 100.0)

    if text_result is None:
        penalty_label_noise = 0.0
        sub_score_label_noise = 100.0
        penalty_semantic = 0.0
        sub_score_semantic = 100.0
    else:
        noise_count = len(text_result.get("label_noise_issues", []))
        text_row_count = int(text_result.get("row_count", 1))
        noise_fraction = noise_count / text_row_count if text_row_count > 0 else 0.0
        penalty_label_noise = min(noise_fraction * 100.0 * 0.25, 25.0)
        sub_score_label_noise = clamp(100.0 - (noise_fraction * 100.0), 0.0, 100.0)

        incon_count = len(text_result.get("semantic_inconsistencies", []))
        incon_fraction = incon_count / text_row_count if text_row_count > 0 else 0.0
        penalty_semantic = min(incon_fraction * 100.0 * 0.20, 20.0)
        sub_score_semantic = clamp(100.0 - (incon_fraction * 100.0), 0.0, 100.0)

    overall_score = clamp(
        100.0
        - (
            penalty_missing
            + penalty_balance
            + penalty_duplication
            + penalty_label_noise
            + penalty_semantic
        ),
        0.0,
        100.0,
    )

    overall_score = round(overall_score, 2)
    score_breakdown = {
        "missing_values": round(sub_score_missing, 2),
        "class_balance": round(sub_score_balance, 2),
        "duplicates": round(sub_score_duplication, 2),
        "label_noise": round(sub_score_label_noise, 2),
        "semantic_consistency": round(sub_score_semantic, 2),
    }

    grade = "A" if overall_score >= 90.0 else "B" if overall_score >= 75.0 else "C" if overall_score >= 60.0 else "D"

    logger.debug(
        "Computed health score: overall=%s, grade=%s, breakdown=%s",
        overall_score,
        grade,
        score_breakdown,
    )

    return {
        "overall_score": overall_score,
        "grade": grade,
        "score_breakdown": score_breakdown,
    }
