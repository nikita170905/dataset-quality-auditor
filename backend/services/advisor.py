from typing import Any, Dict, List, Optional


def generate_issues(tabular_result: dict, text_result: dict | None, score_breakdown: dict) -> list[dict]:
    """Generate issue dictionaries matching the IssueItem schema from audit results."""
    issues: list[dict] = []

    vals = [float(v) for v in tabular_result.get("missing_values", {}).values()]
    avg_missing = sum(vals) / len(vals) if vals else 0.0
    if avg_missing > 20.0:
        issues.append(
            {
                "category": "Missing Values",
                "severity": "CRITICAL",
                "description": f"High missing data rate ({avg_missing:.1f}% avg)",
                "fix_suggestion": "Impute using column median/mode or drop columns above 40% threshold",
            }
        )
    elif avg_missing > 5.0:
        issues.append(
            {
                "category": "Missing Values",
                "severity": "WARNING",
                "description": "Moderate missing values detected",
                "fix_suggestion": "Review columns for systematic missingness patterns",
            }
        )

    ratio = tabular_result.get("imbalance_ratio")
    if ratio is not None:
        if ratio > 10.0:
            issues.append(
                {
                    "category": "Class Imbalance",
                    "severity": "CRITICAL",
                    "description": f"Severe class imbalance (ratio: {ratio:.2f})",
                    "fix_suggestion": "Apply SMOTE oversampling or collect more minority class samples",
                }
            )
        elif ratio > 5.0:
            issues.append(
                {
                    "category": "Class Imbalance",
                    "severity": "WARNING",
                    "description": f"Moderate class imbalance (ratio: {ratio:.2f})",
                    "fix_suggestion": "Consider oversampling minority or using class_weight='balanced'",
                }
            )
        elif ratio > 3.0:
            issues.append(
                {
                    "category": "Class Imbalance",
                    "severity": "INFO",
                    "description": f"Mild class imbalance detected (ratio: {ratio:.2f})",
                    "fix_suggestion": "Monitor per-class metrics, consider stratified sampling",
                }
            )

    count = int(tabular_result.get("duplicate_rows", {}).get("count", 0))
    row_count = int(tabular_result.get("row_count", 1))
    dup_fraction = count / row_count if row_count > 0 else 0.0
    if dup_fraction > 0.10:
        issues.append(
            {
                "category": "Data Duplication",
                "severity": "CRITICAL",
                "description": f"Over 10% duplicate rows ({count} duplicates)",
                "fix_suggestion": "Deduplicate before training — use pandas drop_duplicates()",
            }
        )
    elif dup_fraction > 0.02:
        issues.append(
            {
                "category": "Data Duplication",
                "severity": "WARNING",
                "description": f"Some duplicate rows present ({count} duplicates)",
                "fix_suggestion": "Review duplicates — some may be valid repeated observations",
            }
        )

    if text_result is not None:
        noise_count = len(text_result.get("label_noise_issues", []))
        t_rows = int(text_result.get("row_count", 1))
        noise_fraction = noise_count / t_rows if t_rows > 0 else 0.0
        if noise_fraction > 0.15:
            issues.append(
                {
                    "category": "Label Noise",
                    "severity": "CRITICAL",
                    "description": f"High label noise ({noise_count} suspicious samples)",
                    "fix_suggestion": "Re-annotate flagged samples — review suggested_label column",
                }
            )
        elif noise_fraction > 0.05:
            issues.append(
                {
                    "category": "Label Noise",
                    "severity": "WARNING",
                    "description": "Moderate label noise detected",
                    "fix_suggestion": "Spot-check label_noise_issues, prioritize low label_quality items",
                }
            )

        pairs = len(text_result.get("semantic_inconsistencies", []))
        if pairs > 20:
            issues.append(
                {
                    "category": "Semantic Inconsistencies",
                    "severity": "WARNING",
                    "description": f"Many near-duplicate texts with conflicting labels ({pairs} pairs)",
                    "fix_suggestion": "Review semantic_inconsistencies — unify labels or remove duplicates",
                }
            )
        elif pairs > 5:
            issues.append(
                {
                    "category": "Semantic Inconsistencies",
                    "severity": "INFO",
                    "description": f"Some ambiguous text-label pairs found ({pairs} pairs)",
                    "fix_suggestion": "Check inconsistency pairs for annotation errors",
                }
            )

    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    return sorted(issues, key=lambda x: severity_order.get(x["severity"], 3))


def generate_augmentation_strategies(tabular_result: dict, text_result: dict | None, issues: list[dict]) -> list[dict]:
    """Map issue categories and severities to remediation strategy definitions."""
    strategies: list[dict] = []

    has_imbalance_anomaly = any(
        i["category"] == "Class Imbalance" and i["severity"] in ["CRITICAL", "WARNING"]
        for i in issues
    )
    if has_imbalance_anomaly:
        strategies.append(
            {
                "strategy_name": "Minority class oversampling",
                "target_issue": "Class Imbalance",
                "method": "SMOTE (use imbalanced-learn library)",
                "priority": 1,
            }
        )

    if text_result is not None:
        if len(text_result.get("label_noise_issues", [])) > 0:
            strategies.append(
                {
                    "strategy_name": "Re-annotation campaign",
                    "target_issue": "Label Noise",
                    "method": "Export flagged indices to CSV for human review",
                    "priority": 2,
                }
            )
            strategies.append(
                {
                    "strategy_name": "Synonym replacement augmentation",
                    "target_issue": "Label Noise",
                    "method": "Use nltk.corpus.wordnet for synonym swap on clean samples",
                    "priority": 3,
                }
            )
        if len(text_result.get("semantic_inconsistencies", [])) > 0:
            strategies.append(
                {
                    "strategy_name": "Deduplication + label unification",
                    "target_issue": "Semantic Inconsistencies",
                    "method": "Cluster near-duplicates, assign majority label per cluster",
                    "priority": 2,
                }
            )

    has_critical_missing = any(
        i["category"] == "Missing Values" and i["severity"] == "CRITICAL"
        for i in issues
    )
    if has_critical_missing:
        strategies.append(
            {
                "strategy_name": "Systematic imputation",
                "target_issue": "Missing Values",
                "method": "sklearn SimpleImputer: median for numeric, mode for categorical",
                "priority": 1,
            }
        )

    return sorted(strategies, key=lambda x: x["priority"])
