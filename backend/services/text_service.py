from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sentence_transformers import CrossEncoder, SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_selection import chi2
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Module-level thread-safe singleton state memory indicators
_model: SentenceTransformer | None = None
_reranker: CrossEncoder | None = None


def get_embedding_model() -> SentenceTransformer:
    """Returns a cached singleton instance of the embedding model.

    Initializes once on first call, reuses on all subsequent calls.
    Never re-downloads or re-loads weights mid-session.
    
    Returns:
        SentenceTransformer: Pre-loaded all-MiniLM-L6-v2 vectorization instance.
    """
    global _model
    if _model is None:
        logger.info("Initializing SentenceTransformer model (first load)...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded and cached seamlessly in memory.")
    return _model


def get_reranker() -> CrossEncoder | None:
    """Return the optional free local passage reranker, loaded on first search."""
    global _reranker
    if _reranker is None:
        try:
            logger.info("Initializing local semantic reranker (first search)...")
            _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        except Exception as exc:
            logger.warning("Semantic reranker unavailable; using embedding scores: %s", exc)
    return _reranker


def _stratified_sample(df: pd.DataFrame, label_col: str, max_rows: int) -> pd.DataFrame:
    """Returns a stratified sample preserving class proportions.
    
    Falls back to a standard random sample if group sizes are too small 
    or if stratification fails due to extreme skew.

    Args:
        df: Cleaned pandas DataFrame containing the target label column.
        label_col: Name of the column tracking categorical class distributions.
        max_rows: The absolute ceiling limit of indices allowed in the slice.

    Returns:
        pd.DataFrame: A proportion-retaining balanced snapshot of the dataset.
    """
    if len(df) <= max_rows:
        return df

    # Proportional per-group quotas, then sample each group independently.
    # Deliberately avoids groupby().apply(): under pandas 3.x it pushes the
    # grouping key out of the result frame, silently dropping the label
    # column and causing downstream KeyError crashes in the text audits.
    try:
        counts = df[label_col].value_counts()
        quotas = (counts * (max_rows / len(df))).astype(int)

        parts = []
        for label, quota in quotas.items():
            group = df[df[label_col] == label]
            # Keep at least one row of every class present in the data.
            take = min(max(1, int(quota)), len(group))
            if take > 0:
                parts.append(group.sample(n=take, random_state=42))
        sampled = pd.concat(parts)

        # Rounding can push the total a few rows over the cap; enforce it.
        if len(sampled) > max_rows:
            sampled = sampled.sample(n=max_rows, random_state=42)
    except Exception as exc:
        logger.warning(
            "Stratified sampling encountered an anomaly: %s. "
            "Falling back to uniform random sampling.",
            exc,
        )
        sampled = df.sample(n=max_rows, random_state=42)
    # Keep the ORIGINAL row index so reported idx values stay meaningful.
    return sampled.sort_index()


def detect_semantic_inconsistencies(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    similarity_threshold: float = 0.95,
    max_rows: int = 5000,
    max_pairs: int = 500,
) -> List[Dict[str, object]]:
    """Detect semantically similar text pairs with differing labels using stratified tracking loops.

    Args:
        df: Pre-validated pandas DataFrame containing text and label columns.
        text_column: Name of the text column to compare.
        label_column: Name of the label column for disagreement detection.
        similarity_threshold: Minimum cosine similarity to consider a pair inconsistent.
        max_rows: Maximum number of rows to process after dropping missing values.

    Returns:
        List[Dict[str, object]]: Array of dictionaries describing inconsistent text pairs.
    """
    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    if len(df_clean) > max_rows:
        logger.info(
            "Text audit dataset dimensions (%d rows) breach optimization limits. "
            "Triggering balanced stratified sampling matrix generation down to max_rows=%d.",
            len(df_clean),
            max_rows,
        )
        df_clean = _stratified_sample(df_clean, label_column, max_rows)

    if df_clean.empty:
        return []

    text_values = df_clean[text_column].astype(str).tolist()
    label_values = df_clean[label_column].tolist()
    original_indices = df_clean.index.to_numpy()

    # Utilize the high-performance in-memory singleton instance
    model = get_embedding_model()
    embeddings = model.encode(text_values, convert_to_numpy=True)

    similarity_matrix = cosine_similarity(embeddings)
    label_codes, _ = pd.factorize(pd.Series(label_values))

    # Vectorized pair search (the old Python double loop was O(n^2) in pure Python).
    # Only the upper triangle is used so each pair is reported once.
    candidate_mask = np.triu(similarity_matrix > similarity_threshold, k=1)
    candidate_mask &= label_codes[:, None] != label_codes[None, :]
    rows, cols = np.nonzero(candidate_mask)
    if len(rows) > max_pairs:
        # Keep the strongest conflicts only: an unbounded list can reach many MB
        # and break the report download.
        logger.info("Found %d conflicting pairs; reporting the %d most similar.", len(rows), max_pairs)
        keep = np.argsort(-similarity_matrix[rows, cols])[:max_pairs]
        rows, cols = rows[keep], cols[keep]
    order = np.argsort(-similarity_matrix[rows, cols])
    rows, cols = rows[order], cols[order]

    inconsistencies: List[Dict[str, object]] = [
        {
            "idx_1": int(original_indices[i]),
            "idx_2": int(original_indices[j]),
            "text_1": str(text_values[i]),
            "text_2": str(text_values[j]),
            "label_1": str(label_values[i]),
            "label_2": str(label_values[j]),
            "similarity": round(float(similarity_matrix[i, j]), 4),
        }
        for i, j in zip(rows, cols)
    ]
    return inconsistencies


# Only neighbours at least this similar count as evidence. For ordinary prose a
# nearest neighbour is usually just "another text on the same topic" (e.g. any
# movie review), and topic similarity says nothing about whether labels agree,
# so using every neighbour made clean real datasets look inconsistent.
SEMANTIC_NEIGHBOR_MIN_SIM = 0.85
SEMANTIC_MIN_EVIDENCE_ROWS = 5


def compute_semantic_consistency_score(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    max_rows: int = 2000,
) -> float:
    """0-100: share of near-duplicate text pairs whose labels agree.

    For every row we find its nearest neighbour; only rows whose neighbour is a
    near-duplicate (cosine >= SEMANTIC_NEIGHBOR_MIN_SIM) are evidence. The score
    is the percentage of those pairs with the same label. With too little
    near-duplicate evidence the dataset has no detectable conflicts, so 100.
    """
    if text_column not in df.columns or label_column not in df.columns:
        raise ValueError("Text and label columns are required for semantic scoring")

    df_clean = df[[text_column, label_column]].dropna().copy()
    if len(df_clean) > max_rows:
        df_clean = _stratified_sample(df_clean, label_column, max_rows)
    if len(df_clean) < 2:
        return 50.0

    texts = df_clean[text_column].astype(str).tolist()
    label_codes, _ = pd.factorize(pd.Series(df_clean[label_column].tolist()))
    embeddings = get_embedding_model().encode(texts, convert_to_numpy=True)
    similarities = cosine_similarity(embeddings)
    np.fill_diagonal(similarities, -np.inf)
    nearest = np.argmax(similarities, axis=1)
    nearest_sim = similarities[np.arange(len(texts)), nearest]

    close = nearest_sim >= SEMANTIC_NEIGHBOR_MIN_SIM
    if int(close.sum()) < SEMANTIC_MIN_EVIDENCE_ROWS:
        return 100.0

    agree = label_codes[close] == label_codes[nearest[close]]
    return round(float(agree.mean() * 100.0), 2)


# A row is flagged as a label-noise candidate when a model trained on the OTHER
# rows (out-of-fold) gives its assigned label a probability below this value
# AND prefers a different class. Same idea as Cleanlab's confident learning.
LABEL_NOISE_CONFIDENCE = 0.25
# Inverse regularization of the label-quality model. Lower = softer probabilities.
# Chosen on a real flip test (1,500 airline tweets, 0/5/10/20% labels flipped):
# C=10 was overconfident on ambiguous tweets (13.7% of a CLEAN file flagged, lowest
# AUC); C=1 flagged 8.6% of the clean file with the same ~0.7 recall on planted flips.
LABEL_NOISE_C = 1.0
# Score = 100 - LABEL_NOISE_SCORE_SLOPE * (fraction of rows flagged).
# 5% flagged -> 85, 10% -> 70, 20% -> 40, 33%+ -> 0.
LABEL_NOISE_SCORE_SLOPE = 300.0
# If a model that never saw a row can barely beat chance at predicting the labels
# from the text, the labels are (nearly) unrelated to the text. Per-row "noise"
# flags are meaningless then, so we report one dataset-level failure instead.
# signal = (balanced_accuracy - chance) / (1 - chance); 0 = random, 1 = perfect.
LABEL_MIN_SIGNAL = 0.15
LABEL_UNLEARNABLE_SCORE = 30.0


def _out_of_fold_label_quality(
    embeddings: np.ndarray,
    labels: list,
    C: float = LABEL_NOISE_C,
    confidence: float = LABEL_NOISE_CONFIDENCE,
) -> Optional[dict]:
    """Estimate, for every row, how plausible its label is given all other rows.

    Trains a logistic regression on normalized embeddings with stratified
    cross-validation, so each row is scored by a model that never saw it.
    Returns None when there is not enough data (classes with < 2 rows are dropped).
    """
    y = np.asarray([str(label) for label in labels])
    class_names, y_idx = np.unique(y, return_inverse=True)
    keep = np.bincount(y_idx)[y_idx] >= 2
    if keep.sum() < 6 or len(np.unique(y_idx[keep])) < 2:
        return None

    kept_classes, y_kept = np.unique(y_idx[keep], return_inverse=True)
    n_splits = int(min(5, np.bincount(y_kept).min()))
    if n_splits < 2:
        return None

    features = normalize(embeddings[keep])
    classifier = LogisticRegression(max_iter=1000, C=C, class_weight="balanced")
    folds = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    proba = cross_val_predict(classifier, features, y_kept, cv=folds, method="predict_proba")

    p_given = proba[np.arange(len(y_kept)), y_kept]
    predicted = proba.argmax(axis=1)

    chance = 1.0 / len(kept_classes)
    balanced_acc = float(balanced_accuracy_score(y_kept, predicted))
    signal = (balanced_acc - chance) / (1.0 - chance)
    learnable = signal >= LABEL_MIN_SIGNAL

    flagged = (p_given < confidence) & (predicted != y_kept) & learnable
    return {
        "learnable": learnable,
        "signal": signal,
        "keep": keep,
        "class_names": class_names[kept_classes],
        "p_given": p_given,
        "predicted": predicted,
        "flagged": flagged,
    }


def detect_label_noise(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
) -> List[Dict[str, object]]:
    """Flag rows whose label disagrees with what the rest of the dataset implies.

    Uses out-of-fold logistic regression on sentence embeddings: a row is
    suspicious when a model that never saw it assigns its given label a low
    probability and prefers another class. This is evidence for human review,
    not proof of annotation error.
    """
    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    max_noise_rows = 2000
    if len(df_clean) > max_noise_rows:
        df_clean = _stratified_sample(df_clean, label_column, max_noise_rows)

    if len(df_clean) < 6:
        raise ValueError("Too few samples for label noise detection (min 6 required)")

    text_values = df_clean[text_column].astype(str).tolist()
    label_values = df_clean[label_column].tolist()
    original_indices = df_clean.index.to_numpy()

    if len(set(label_values)) < 2:
        raise ValueError("At least 2 classes are required for label noise detection")

    embeddings = get_embedding_model().encode(text_values, convert_to_numpy=True)
    result = _out_of_fold_label_quality(embeddings, label_values)
    if result is None:
        return []

    kept_rows = np.flatnonzero(result["keep"])
    issues: List[Dict[str, object]] = []
    for position in np.flatnonzero(result["flagged"]):
        row = int(kept_rows[position])
        issues.append(
            {
                "idx": int(original_indices[row]),
                "text": str(text_values[row]),
                "given_label": str(label_values[row]),
                "suggested_label": str(result["class_names"][result["predicted"][position]]),
                "label_quality": round(float(result["p_given"][position]), 4),
            }
        )
    issues.sort(key=lambda item: item["label_quality"])
    return issues


def compute_label_noise_score(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    max_rows: int = 2000,
) -> float:
    """0-100 label-quality score = 100 - slope * (fraction of rows flagged as noisy).

    Uses exactly the same criterion as detect_label_noise, so the score, the
    issue list and the advisor can never contradict each other.
    """
    if text_column not in df.columns or label_column not in df.columns:
        raise ValueError("Text and label columns are required for label scoring")

    df_clean = df[[text_column, label_column]].dropna().copy()
    if len(df_clean) > max_rows:
        df_clean = _stratified_sample(df_clean, label_column, max_rows)
    if len(df_clean) < 6 or df_clean[label_column].nunique() < 2:
        return 50.0

    texts = df_clean[text_column].astype(str).tolist()
    labels = df_clean[label_column].tolist()
    embeddings = get_embedding_model().encode(texts, convert_to_numpy=True)
    result = _out_of_fold_label_quality(embeddings, labels)
    if result is None:
        return 50.0

    if not result["learnable"]:
        logger.info("Labels look unrelated to the text (signal=%.3f).", result["signal"])
        return LABEL_UNLEARNABLE_SCORE

    noise_rate = float(result["flagged"].mean())
    return round(float(np.clip(100.0 - LABEL_NOISE_SCORE_SLOPE * noise_rate, 0.0, 100.0)), 2)


def detect_spurious_correlations(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    top_n: int = 10,
) -> dict[str, list[dict]]:
    """Detect tokens that are statistically correlated with each class label,
    ensuring directionality and removing raw HTML noise.

    Args:
        df: Pre-validated pandas DataFrame containing text and label columns.
        text_column: Name of the text column to analyze.
        label_column: Name of the label column for tracking correlations.
        top_n: Maximum number of highly correlated keywords to return per class.

    Returns:
        dict[str, list[dict]]: Structured keywords mapped per label signature.
    """
    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    unique_classes = df_clean[label_column].nunique()
    if unique_classes < 2:
        raise ValueError("Need at least 2 classes for spurious correlation detection")

    def clean_text(text: str) -> str:
        text = str(text)
        text = re.sub(r"<br\s*/?>", " ", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    cleaned_texts = [clean_text(t) for t in df_clean[text_column].tolist()]

    vectorizer = CountVectorizer(stop_words='english', min_df=2)
    X = vectorizer.fit_transform(cleaned_texts)

    vocab = vectorizer.get_feature_names_out()
    if len(vocab) == 0 or X.shape[1] == 0:
        logger.warning("CountVectorizer produced empty vocabulary; returning empty dictionary.")
        return {}

    X_array = X.toarray()
    global_means = np.mean(X_array, axis=0)

    result: dict[str, list[dict]] = {}
    class_names = df_clean[label_column].unique()

    for class_name in class_names:
        y_binary = (df_clean[label_column] == class_name).astype(int).to_numpy()
        chi2_scores, _ = chi2(X, y_binary)
        
        class_mask = (y_binary == 1)
        class_means = np.mean(X_array[class_mask], axis=0)
        
        valid_direction_mask = class_means > global_means
        directional_scores = np.where(valid_direction_mask, chi2_scores, -1.0)
        
        ordered_indices = np.argsort(directional_scores)[::-1]
        
        top_tokens = []
        for i in ordered_indices:
            if len(top_tokens) >= top_n or directional_scores[i] < 0:
                break
            top_tokens.append(
                {
                    "token": str(vocab[i]),
                    "correlation_score": float(round(float(directional_scores[i]), 4)),
                }
            )

        result[str(class_name)] = top_tokens

    return result


# Calibration constants for the domain relevance score (all-MiniLM-L6-v2).
# Measured mean intent-vs-row cosine similarities:
#   on-domain pairs      ~ 0.21 - 0.30
#   topically related    ~ 0.10 - 0.21
#   clearly off-domain   ~ 0.00 - 0.05
# Raw similarities therefore occupy a narrow band near zero, so the score
# stretches the observed band [SIM_FLOOR, SIM_CEILING] onto 0-100. Anything
# at or below SIM_FLOOR scores 0; anything at or above SIM_CEILING scores 100.
DOMAIN_SIM_FLOOR = 0.0
DOMAIN_SIM_CEILING = 0.5


def _calibrate_similarity(mean_similarity: float) -> float:
    """Stretch the observed MiniLM similarity band onto a 0-100 score.

    Piecewise-linear band scaling using only numpy math: below DOMAIN_SIM_FLOOR
    clamps to 0, above DOMAIN_SIM_CEILING clamps to 100, and in between the
    value maps linearly. This spreads realistic intent-vs-row similarities
    (which cluster near 0.0-0.3) across the full score range, so off-domain
    intents drop well under the warning threshold instead of hovering near 50.
    """
    span = DOMAIN_SIM_CEILING - DOMAIN_SIM_FLOOR
    scaled = (mean_similarity - DOMAIN_SIM_FLOOR) / span * 100.0
    return float(np.clip(scaled, 0.0, 100.0))


def compute_domain_relevance(
    df: pd.DataFrame,
    text_column: str,
    project_intent: str,
    sample_size: int = 50,
    low_score_threshold: float = 40.0,
) -> Dict[str, object]:
    """Estimate how well a dataset's text semantics match the user's project goal.

    Encodes the project intent string and a sample of rows from the text column
    with the shared MiniLM embedding model, then reports the average cosine
    similarity, calibrated against the model's empirically observed similarity
    band, as a 0-100 suitability score.

    Args:
        df: Source pandas DataFrame containing the text column.
        text_column: Name of the free-text column to compare against the intent.
        project_intent: Free-text description of what the user is building.
        sample_size: Number of rows to sample for the comparison (default 50).
        low_score_threshold: Score below which a domain mismatch warning fires.

    Returns:
        Dict with keys:
            domain_suitability_score: float in 0-100, or None if the check
                could not be performed.
            domain_warning: human-readable warning string, or None.
    """
    empty_result: Dict[str, object] = {
        "domain_suitability_score": None,
        "domain_warning": None,
    }

    intent = (project_intent or "").strip()
    if not intent:
        return empty_result
    if text_column not in df.columns:
        return empty_result

    texts = df[text_column].dropna().astype(str)
    texts = texts[texts.str.strip() != ""]
    if texts.empty:
        return empty_result

    # Fixed seed keeps the sample (and therefore the score) reproducible.
    sample = texts.sample(n=min(sample_size, len(texts)), random_state=42)

    try:
        model = get_embedding_model()

        intent_embedding = model.encode([intent], convert_to_numpy=True)[0]
        row_embeddings = model.encode(sample.tolist(), convert_to_numpy=True)
    except Exception as exc:
        logger.error("Domain relevance: embedding model failure: %s", exc, exc_info=True)
        return empty_result

    # Average cosine similarity between the intent and every sampled row.
    intent_norm = np.linalg.norm(intent_embedding)
    row_norms = np.linalg.norm(row_embeddings, axis=1)
    valid_mask = (intent_norm > 0) & (row_norms > 0)
    if not valid_mask.any():
        return empty_result

    similarities = (
        row_embeddings[valid_mask]
        @ intent_embedding
        / (row_norms[valid_mask] * intent_norm)
    )
    mean_similarity = float(np.clip(np.mean(similarities), -1.0, 1.0))

    # Calibrated band scaling instead of the naive [-1, 1] linear mapping:
    # MiniLM intent-vs-row similarities cluster near 0.0-0.3, so the naive
    # mapping compressed every realistic case into 45-65 points and off-topic
    # intents could never drop under the warning threshold.
    score = round(_calibrate_similarity(mean_similarity), 2)

    warning = None
    if score < low_score_threshold:
        warning = (
            f"Warning: Dataset semantics may not match your intended use case "
            f"(average semantic similarity {mean_similarity:.2f}). "
            "This score compares TOPICS, not tasks: describe your data or domain "
            "(e.g. 'customer reviews of products') rather than only the task name "
            "(e.g. 'sentiment analysis'), or consider a dataset closer to your project goal."
        )

    return {
        "domain_suitability_score": score,
        "domain_warning": warning,
    }