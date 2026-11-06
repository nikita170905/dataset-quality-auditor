from typing import Any, Dict, List, Optional


MAX_REPORTED_PAIRS = 500  # keep in sync with detect_semantic_inconsistencies(max_pairs=...)


def _has_real_text(text_result: dict | None) -> bool:
    """True when text checks ran on genuine natural-language text (not synthesized rows)."""
    return text_result is not None and not text_result.get("text_is_synthetic")


def generate_issues(tabular_result: dict, text_result: dict | None, score_breakdown: dict) -> list[dict]:
    """Generate issue dictionaries matching the IssueItem schema from audit results."""
    issues: list[dict] = []

    missing_values = tabular_result.get("missing_values", {}) or {}
    vals = [float(v) for v in missing_values.values()]
    avg_missing = sum(vals) / len(vals) if vals else 0.0
    worst = sorted(
        ((str(col), float(pct)) for col, pct in missing_values.items() if float(pct) > 0.0),
        key=lambda item: -item[1],
    )[:3]
    worst_text = ", ".join(f"{col} {pct:.1f}%" for col, pct in worst)
    max_missing = worst[0][1] if worst else 0.0
    if avg_missing > 20.0:
        issues.append(
            {
                "category": "Missing Values",
                "severity": "CRITICAL",
                "description": f"High missing data rate ({avg_missing:.1f}% avg; worst: {worst_text})",
                "fix_suggestion": "Impute using column median/mode or drop columns above 40% threshold",
            }
        )
    elif avg_missing > 5.0 or max_missing > 40.0:
        issues.append(
            {
                "category": "Missing Values",
                "severity": "WARNING",
                "description": f"Missing values detected (worst: {worst_text})",
                "fix_suggestion": "Drop or impute columns above 40% missing; review the rest for systematic missingness",
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

    if _has_real_text(text_result):
        noise_count = len(text_result.get("label_noise_issues", []))
        t_rows = int(text_result.get("row_count", 1))
        noise_fraction = noise_count / t_rows if t_rows > 0 else 0.0
        if noise_fraction > 0.133:  # label-noise score < 60 (dashboard 'Critical')
            issues.append(
                {
                    "category": "Label Noise",
                    "severity": "CRITICAL",
                    "description": f"High label noise ({noise_count} suspicious samples)",
                    "fix_suggestion": "Re-annotate flagged samples — review suggested_label column",
                }
            )
        elif noise_fraction > 0.067:  # label-noise score < 80 (dashboard 'Needs Attention')
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
                    "description": f"Many near-duplicate texts with conflicting labels ({pairs}{'+' if pairs >= MAX_REPORTED_PAIRS else ''} pairs)",
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

    if _has_real_text(text_result):
        # Low measured consistency without enough conflicting pairs to trigger the
        # pair-count issue above: surface it so the report never says "healthy"
        # while the score card is red.
        semantic_score = score_breakdown.get("semantic_consistency", 100.0)
        if semantic_score < 70.0 and not any(i["category"] == "Semantic Inconsistencies" for i in issues):
            issues.append(
                {
                    "category": "Semantic Inconsistencies",
                    "severity": "WARNING",
                    "description": f"Low semantic consistency score ({semantic_score:.1f}/100)",
                    "fix_suggestion": "Similar texts often carry different labels; review labeling guidelines",
                }
            )

        label_score = score_breakdown.get("label_noise", 100.0)
        if label_score < 50.0 and not any(i["category"] == "Label Noise" for i in issues):
            issues.append(
                {
                    "category": "Label Noise",
                    "severity": "CRITICAL",
                    "description": "Labels appear unrelated to the text: a model that never saw each row cannot predict its label better than chance",
                    "fix_suggestion": "Check that the right label column was chosen and that labels were not shuffled or assigned randomly",
                }
            )

        domain_score = text_result.get("domain_suitability_score")
        if domain_score is not None and domain_score < 40.0:
            issues.append(
                {
                    "category": "Domain Suitability",
                    "severity": "WARNING" if domain_score < 20.0 else "INFO",
                    "description": f"Dataset text is semantically distant from your project intent ({domain_score:.1f}/100)",
                    "fix_suggestion": "Describe your data domain in the intent (not just the task), or use a dataset closer to your goal",
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
                "method": (
                    "Random oversampling of minority texts or class-weighted loss (SMOTE needs numeric features)"
                    if _has_real_text(text_result)
                    else "SMOTE (use imbalanced-learn library)"
                ),
                "priority": 1,
            }
        )

    has_label_issue = any(i["category"] == "Label Noise" for i in issues)
    has_semantic_issue = any(i["category"] == "Semantic Inconsistencies" for i in issues)
    if _has_real_text(text_result):
        if has_label_issue and len(text_result.get("label_noise_issues", [])) > 0:
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
        if has_semantic_issue and len(text_result.get("semantic_inconsistencies", [])) > 0:
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