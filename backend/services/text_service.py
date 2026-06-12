from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_selection import chi2
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.preprocessing import LabelEncoder

try:
    from cleanlab.filter import find_label_issues
except ImportError:  # pragma: no cover
    find_label_issues = None

logger = logging.getLogger(__name__)

# Module-level thread-safe singleton state memory indicators
_model: SentenceTransformer | None = None


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

    try:
        # Group by labels, calculate exact target ratio chunk weights, and sample each group evenly
        return df.groupby(label_col, group_keys=False).apply(
            lambda x: x.sample(
                min(len(x), max(1, int(max_rows * len(x) / len(df)))),
                random_state=42
            )
        ).reset_index(drop=True)
    except Exception as exc:
        logger.warning(
            "Stratified sampling execution split encountered an anomaly: %s. "
            "Falling back to basic uniform random sampling distribution arrays.", 
            exc
        )
        return df.sample(max_rows, random_state=42).reset_index(drop=True)


def detect_semantic_inconsistencies(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    similarity_threshold: float = 0.95,
    max_rows: int = 5000,
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
    inconsistencies: List[Dict[str, object]] = []

    for i in range(similarity_matrix.shape[0]):
        for j in range(i + 1, similarity_matrix.shape[1]):
            similarity = float(similarity_matrix[i, j])
            if similarity <= similarity_threshold:
                continue
            if label_values[i] == label_values[j]:
                continue

            inconsistencies.append(
                {
                    "idx_1": int(original_indices[i]),
                    "idx_2": int(original_indices[j]),
                    "text_1": str(text_values[i]),
                    "text_2": str(text_values[j]),
                    "label_1": str(label_values[i]),
                    "label_2": str(label_values[j]),
                    "similarity": round(similarity, 4),
                }
            )

    return inconsistencies


def detect_label_noise(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
) -> List[Dict[str, object]]:
    """Detect potential label noise using stratified sampling loops and cross-validated class probabilities.

    Args:
        df: Pre-validated pandas DataFrame containing text and label columns.
        text_column: Name of the text column to analyze.
        label_column: Name of the label column whose quality is evaluated.

    Returns:
        List[Dict[str, object]]: Array of dictionaries describing suspected noisy labels.
    """
    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    # Hard target boundary limit configured for cleanlab probability matrix calculations
    max_noise_rows = 2000
    if len(df_clean) > max_noise_rows:
        logger.info(
            "Label noise data dimensions (%d rows) breach baseline optimization scales. "
            "Applying stratified sampling snapshot sequences down to target cap=%d.",
            len(df_clean),
            max_noise_rows,
        )
        df_clean = _stratified_sample(df_clean, label_column, max_noise_rows)

    if len(df_clean) < 6:
        raise ValueError("Too few samples for label noise detection (min 6 required)")

    label_counts = df_clean[label_column].value_counts()
    for class_name, count in label_counts.items():
        if count < 3:
            raise ValueError(
                f"Class '{class_name}' has fewer than 3 samples in the stratified matrix snapshot. "
                "3-fold Cross-Validation loops strictly require at least 3 active row vectors per unique class signature."
            )

    text_values = df_clean[text_column].astype(str).tolist()
    label_values = df_clean[label_column].tolist()
    original_indices = df_clean.index.to_numpy()

    # Utilize the high-performance in-memory singleton instance
    embeddings = get_embedding_model().encode(text_values, convert_to_numpy=True)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(label_values)

    estimator = LogisticRegression(max_iter=1000, C=0.1, random_state=42)
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    pred_probs = cross_val_predict(
        estimator,
        embeddings,
        y_encoded,
        cv=cv,
        method="predict_proba",
    )

    if find_label_issues is not None:
        noisy_indices = find_label_issues(
            labels=y_encoded,
            pred_probs=pred_probs,
            return_indices_ranked_by="self_confidence",
        )
    else:
        logger.warning(
            "cleanlab is not installed in the operating environment; "
            "deploying mathematical low-confidence self-prediction quantiles as an automated analytical fallback structure."
        )
        self_confidence = pred_probs[np.arange(len(y_encoded)), y_encoded]
        threshold = float(np.quantile(self_confidence, 0.2))
        noisy_indices = np.where(self_confidence <= threshold)[0]

    issues: List[Dict[str, object]] = []
    for idx in noisy_indices:
        suggested_label = str(encoder.classes_[np.argmax(pred_probs[idx])])
        label_quality = round(float(pred_probs[idx][y_encoded[idx]]), 4)
        issues.append(
            {
                "idx": int(original_indices[idx]),
                "text": str(text_values[idx]),
                "given_label": str(label_values[idx]),
                "suggested_label": suggested_label,
                "label_quality": label_quality,
            }
        )

    return issues


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