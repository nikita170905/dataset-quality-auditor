from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from services.text_service import get_embedding_model, get_reranker

logger = logging.getLogger(__name__)

qdrant_client = QdrantClient(":memory:")


def _collection_name(file_id: str) -> str:
    return file_id


def ingest_dataset(
    df: pd.DataFrame,
    file_id: str,
    text_column: str | None,
    label_column: str | None = None,
) -> None:
    """Embed a dataset text column into an in-memory Qdrant collection."""
    if not text_column or text_column not in df.columns:
        feature_columns = [column for column in df.columns if column != label_column]
        source_columns = feature_columns or list(df.columns)
        if not source_columns:
            logger.info("Skipping RAG ingestion: dataset has no columns.")
            return
        text_rows = df[source_columns].apply(
            lambda row: " | ".join(
                f"{column}: {value}"
                for column, value in row.items()
                if pd.notna(value) and str(value).strip()
            ),
            axis=1,
        )
    else:
        text_rows = df[text_column].dropna().astype(str)
        text_rows = text_rows[text_rows.str.strip() != ""]

    text_rows = text_rows[text_rows.str.strip() != ""]
    if text_rows.empty:
        logger.info("Skipping RAG ingestion: text column %r has no usable rows.", text_column)
        return

    # Index "label: value | text" so questions like "negative reviews" or
    # "Iris-setosa" can match the label too. The stored/displayed text stays the
    # original row text.
    label_series = df[label_column] if label_column and label_column in df.columns else None

    def _labeled(index, text):
        if label_series is None:
            return text
        value = label_series.get(index)
        return text if value is None or pd.isna(value) else f"{label_column}: {value} | {text}"

    embed_texts = [_labeled(i, t) for i, t in zip(text_rows.index, text_rows.tolist())]
    embeddings = get_embedding_model().encode(embed_texts, convert_to_numpy=True)
    collection_name = _collection_name(file_id)

    if qdrant_client.collection_exists(collection_name):
        qdrant_client.delete_collection(collection_name)

    qdrant_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=int(embeddings.shape[1]), distance=Distance.COSINE),
    )

    points = [
        PointStruct(
            id=int(row_index),
            vector=embedding.tolist(),
            payload={"row_index": int(row_index), "text": text, "embed_text": embed_text},
        )
        for row_index, text, embed_text, embedding in zip(
            text_rows.index, text_rows.tolist(), embed_texts, embeddings
        )
    ]
    qdrant_client.upsert(collection_name=collection_name, points=points)
    logger.info("Indexed %d rows for dataset %s.", len(points), file_id)


def search_dataset(file_id: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Return the closest indexed dataset rows for a natural-language query."""
    collection_name = _collection_name(file_id)
    if not qdrant_client.collection_exists(collection_name):
        return []

    query_text = query.strip()
    if not query_text:
        return []

    query_vector = get_embedding_model().encode([query_text], convert_to_numpy=True)[0].tolist()
    results = qdrant_client.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=max(top_k * 4, top_k),
        with_payload=True,
    ).points

    candidates = [
        {
            "text": str((result.payload or {}).get("text", "")),
            "score": round(float(result.score), 4),
            "row_index": int((result.payload or {}).get("row_index", result.id)),
            "rerank_text": str((result.payload or {}).get("embed_text") or (result.payload or {}).get("text", "")),
        }
        for result in results
    ]

    reranker = get_reranker()
    if reranker and candidates:
        pairs = [(query_text, candidate["rerank_text"]) for candidate in candidates]
        rerank_scores = np.asarray(reranker.predict(pairs, show_progress_bar=False), dtype=float)
        order = np.argsort(-rerank_scores)

        # The ms-marco CrossEncoder returns raw logits that are strongly negative
        # for command-style queries, so sigmoid(logit) rounds to 0.0000 for every
        # row. Rank by the raw logit, but display a relative 0-1 score
        # (best match in this result set = 1.0). If all logits tie, keep cosine.
        low, high = float(rerank_scores.min()), float(rerank_scores.max())
        span = high - low
        reranked = []
        for position in order:
            candidate = dict(candidates[int(position)])
            if span > 1e-9:
                candidate["score"] = round((float(rerank_scores[position]) - low) / span, 4)
            reranked.append(candidate)
        candidates = reranked

    return [{k: v for k, v in c.items() if k != "rerank_text"} for c in candidates[:top_k]]