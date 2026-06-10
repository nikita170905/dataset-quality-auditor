from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Dict, List

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
except ImportError:  # pragma: no cover - optional dependency
    find_label_issues = None

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_sentence_model() -> SentenceTransformer:
    return SentenceTransformer("all-MiniLM-L6-v2")


def detect_semantic_inconsistencies(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    similarity_threshold: float = 0.95,
    max_rows: int = 5000,
) -> List[Dict[str, object]]:
    """Detect semantically similar text pairs with differing labels.

    Args:
        df: Pre-validated pandas DataFrame containing text and label columns.
        text_column: Name of the text column to compare.
        label_column: Name of the label column for disagreement detection.
        similarity_threshold: Minimum cosine similarity to consider a pair inconsistent.
        max_rows: Maximum number of rows to process after dropping missing values.

    Returns:
        A list of dictionaries describing inconsistent text pairs. Each item contains
        original DataFrame indices, text values, labels, and similarity score.
    """

    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    if len(df_clean) > max_rows:
        logger.warning(
            "Truncating text audit input from %d to max_rows=%d before processing.",
            len(df_clean),
            max_rows,
        )
        df_clean = df_clean.iloc[:max_rows]

    if df_clean.empty:
        return []

    text_values = df_clean[text_column].astype(str).tolist()
    label_values = df_clean[label_column].tolist()
    original_indices = df_clean.index.to_numpy()

    model = get_sentence_model()
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
    """Detect potential label noise using cross-validated class probabilities.

    Args:
        df: Pre-validated pandas DataFrame containing text and label columns.
        text_column: Name of the text column to analyze.
        label_column: Name of the label column whose quality is evaluated.

    Returns:
        A list of dictionaries describing suspected noisy labels. Each item contains
        the original DataFrame index, raw text, given label, suggested label, and
        a label_quality score representing the model confidence in the original label.
    """

    if text_column not in df.columns:
        raise ValueError(f"Missing text_column '{text_column}' in DataFrame.")
    if label_column not in df.columns:
        raise ValueError(f"Missing label_column '{label_column}' in DataFrame.")

    df_clean = df[[text_column, label_column]].copy()
    df_clean = df_clean.dropna(subset=[text_column, label_column])

    if len(df_clean) > 2000:
        logger.warning(
            "Truncating label noise detection input from %d to 2000 rows.",
            len(df_clean),
        )
        df_clean = df_clean.iloc[:2000]

    if len(df_clean) < 6:
        raise ValueError("Too few samples for label noise detection (min 6 required)")

    label_counts = df_clean[label_column].value_counts()
    for class_name, count in label_counts.items():
        if count < 3:
            raise ValueError(
                f"Class '{class_name}' has fewer than 3 samples. 3-fold CV requires at least 3 samples per class."
            )

    text_values = df_clean[text_column].astype(str).tolist()
    label_values = df_clean[label_column].tolist()
    original_indices = df_clean.index.to_numpy()

    embeddings = get_sentence_model().encode(text_values, convert_to_numpy=True)

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
            "cleanlab is not installed; using low-confidence predictions as a fallback for label noise detection."
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

    # Task 1: Clean up HTML linebreaks, tags, and normalize whitespace
    def clean_text(text: str) -> str:
        text = str(text)
        text = re.sub(r"<br\s*/?>", " ", text, flags=re.IGNORECASE)  # Clear out <br />
        text = re.sub(r"<[^>]+>", " ", text)                         # Remove general html nodes
        text = re.sub(r"\s+", " ", text)                             # Squash spacing gaps
        return text.strip()

    cleaned_texts = [clean_text(t) for t in df_clean[text_column].tolist()]

    vectorizer = CountVectorizer(stop_words='english', min_df=2)
    X = vectorizer.fit_transform(cleaned_texts)

    vocab = vectorizer.get_feature_names_out()
    if len(vocab) == 0 or X.shape[1] == 0:
        logger.warning("CountVectorizer produced empty vocabulary; returning empty dictionary.")
        return {}

    # Convert sparse array once to matrix rows for efficient conditional slicing
    X_array = X.toarray()
    global_means = np.mean(X_array, axis=0)

    result: dict[str, list[dict]] = {}
    class_names = df_clean[label_column].unique()

    for class_name in class_names:
        y_binary = (df_clean[label_column] == class_name).astype(int).to_numpy()
        
        # Calculate standard Chi2 dependency score metrics
        chi2_scores, _ = chi2(X, y_binary)
        
        # Task 2: Calculate directional affinity using feature conditional grouping means
        class_mask = (y_binary == 1)
        class_means = np.mean(X_array[class_mask], axis=0)
        
        # Retain only words whose occurrence rating inside this class exceeds global base metrics
        valid_direction_mask = class_means > global_means
        directional_scores = np.where(valid_direction_mask, chi2_scores, -1.0)
        
        # Rank features descending, sorting out invalid indicators
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