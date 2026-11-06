# Dataset Quality Auditor

A dataset health evaluation platform built with **FastAPI** and **React**. Upload a CSV, and get a weighted **0–100 health score**, a letter grade, a prioritized list of issues with fixes, remediation strategies, and a semantic search ("Ask your dataset") over the indexed rows.

It checks for class imbalance, label noise, duplicate rows, missing values, near-duplicate texts with conflicting labels, spurious shortcut tokens, and (optionally) how well the data matches your project goal.

> **Status:** Tabular and text/NLP auditing are working. Image dataset auditing is planned but **not implemented yet**.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [How the Audits Work](#how-the-audits-work)
- [Health Score and Grades](#health-score-and-grades)
- [Project Structure](#project-structure)
- [Tuning the Label-Noise Cutoff](#tuning-the-label-noise-cutoff)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

**The problem:** ML teams often lose weeks training on flawed data: mislabeled samples, heavy class imbalance, duplicate records, inconsistent annotations, or a dataset that simply doesn't match the problem domain.

**What this does:** It accepts a CSV, auto-detects the label and text columns, runs statistical and embedding-based checks, and returns a health report you can review in the browser or download as JSON.

**Who it's for:** Anyone building classification models on tabular or text data.

---

## Features

### Auditing
- **Tabular auditor**: class distribution, imbalance ratio, exact duplicate rows, per-column missing-value percentages. Blank or whitespace-only strings count as missing.
- **Text NLP auditor**
  - **Label noise** via out-of-fold logistic regression on sentence embeddings (confident-learning style). Each row is scored by a model that never saw it.
  - **Semantic inconsistencies**: near-duplicate texts (cosine > 0.95) that carry different labels.
  - **Spurious correlations**: tokens most associated with each class (chi-square, direction-checked, HTML stripped).
- **Domain suitability** (optional): describe your project in one line and the auditor scores how semantically close your data is to that goal.
- **Works without a text column**: if the dataset has no free-text column, row text is built from the feature values (`col: value | col: value`). Those text-based scores are marked **low confidence** and excluded from the overall grade.
- **Schema auto-detection on upload**: the text column is guessed from average string length (> 50 chars), and the label column from low-cardinality columns (2–9 unique values), preferring label-like names such as `label`, `target`, `sentiment`, `churn`.

### Reporting
- Weighted health score, grade (A–D), and per-dimension breakdown.
- Rule-based advisor: issues ranked CRITICAL / WARNING / INFO, each with a concrete fix.
- Augmentation and remediation strategies (oversampling, re-annotation, deduplication and label unification, imputation).
- Full JSON report download.

### Ask Your Dataset (RAG search)
- After a full audit, rows are embedded in the background into an in-memory **Qdrant** collection.
- Natural-language queries are matched by vector search, then **reranked** with a local cross-encoder (`ms-marco-MiniLM-L-6-v2`). The label is included in the indexed text, so queries like "negative reviews" work.
- Scores shown in the UI are relative to the result set (best match = 1.0).

### Engineering
- Embedding model loaded once at startup and cached (singleton).
- NLP sub-audits run concurrently via `asyncio.gather` and a `ThreadPoolExecutor`.
- Stratified sampling that preserves class proportions and original row indices.
- A Server-Sent Events endpoint for full-audit progress.

---

## Architecture

```
React (Vite)                                FastAPI
────────────                                ───────
LandingPage ( / )
Workspace   ( /workspace )
  UploadBox ──────────── POST /api/upload ─────────► storage.py (UUID -> bytes)
  AuditForm                                         schema_service.py (infer columns)
  DynamicLoader
  ResultsPanel ◄──────── POST /api/audit ──────────► tabular_service.py
               ◄──────── POST /api/audit/text ─────► text_service.py
  HealthDashboard ◄───── POST /api/audit/full/stream ► tabular + text (parallel)
                         (SSE, final frame = report)  -> scorer.py -> advisor.py
  DatasetChat ────────── POST /api/chat ───────────► rag_service.py (Qdrant + reranker)
                                                      ▲ ingest runs as a background task
```

**Design rule:** service modules (`tabular_service`, `text_service`, `scorer`, `advisor`, `schema_service`) contain no FastAPI imports, so they can be tested on their own.

### Data flow
1. The CSV is uploaded and stored as raw bytes in an in-memory dict keyed by UUID. The backend profiles the first 1,000 rows and returns the columns plus guessed text and label columns.
2. The user confirms or changes the columns, picks an audit mode, and optionally types a project intent.
3. The backend runs the tabular audit, then (full audit) the text audits in parallel.
4. `scorer.py` computes sub-scores, the overall score and the grade. `advisor.py` produces issues and strategies.
5. The report is sent to the browser, and the dataset is indexed in the background for chat.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 |
| Data | Pandas, NumPy |
| ML / NLP | scikit-learn, Sentence-Transformers (`all-MiniLM-L6-v2`), CrossEncoder reranker (`cross-encoder/ms-marco-MiniLM-L-6-v2`) |
| Vector store | Qdrant (in-memory mode) |
| Frontend | React 19, Vite, Axios, Recharts |
| Styling | Plain CSS with variables (dark theme) and inline styles |
| Concurrency | `asyncio`, `ThreadPoolExecutor` (3 workers) |
| Streaming | Server-Sent Events |

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Internet access on first run (downloads the embedding model, and the reranker on the first chat search; both are cached afterwards)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs at `http://localhost:8000` (interactive docs at `/docs`). Run `uvicorn` from inside `backend/`, because the imports are `from routers import ...`.

On startup, a lifespan hook pre-warms the embedding model.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The landing page is at `/`, and the app is at `/workspace`.

> The API base URL is hard-coded to `http://localhost:8000/api` in `frontend/src/services/api.js`. CORS allows `localhost` / `127.0.0.1` on ports **5173** and **5174**.

---

## Usage Guide

1. **Upload**: drag and drop a `.csv`. A file token appears, and the label and text columns are pre-selected if they could be detected.
2. **Configure**: choose a mode.

   | Mode | Runs | Needs |
   |---|---|---|
   | **Tabular Auditor** | Class balance, duplicates, missing values | Label column |
   | **Text NLP Auditor** | Semantic conflicts, label noise, spurious tokens (+ domain check) | Label + text column |
   | **Full Dataset Audit** | Everything above + health score, grade, issues, strategies, chat | Label column (text optional) |

   Optionally fill in **Project Intent** (e.g. `Sentiment analysis on movie reviews`) to get a Domain Suitability score.
3. **Run the audit**: the full audit streams from the backend; the UI shows a loading indicator while it runs.
4. **Review**: score ring and grade, five sub-score cards, prioritized issues, remediation plans, JSON download, and the **Ask your dataset** chat.

> Tip: for intent, describe your **data domain** ("customer reviews of products"), not only the task ("sentiment analysis"). The score compares topics, not tasks.

---

## API Reference

All routes are prefixed with `/api`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/upload` | multipart `file` (.csv) | `file_id`, `columns`, `inferred_text_column`, `inferred_label_column` |
| POST | `/audit` | `file_id`, `label_column` | Tabular audit (`class_distribution`, `imbalance_ratio`, `duplicate_rows`, `missing_values`, ...) |
| POST | `/audit/text` | `file_id`, `text_column`, `label_column`, `project_intent?` | Inconsistencies, label-noise issues, spurious tokens, counts, domain score/warning |
| POST | `/audit/full` | `file_id`, `label_column`, `text_column?`, `project_intent?` | `HealthScoreReport` (JSON) |
| POST | `/audit/full/stream` | same as `/audit/full` | SSE frames `{stage, progress, message}`; the `complete` frame carries the full report as a JSON string |
| POST | `/chat` | `file_id`, `query`, `top_k` (1–20, default 5) | `matches: [{text, score, row_index}]` |

`/chat` returns an empty list until background indexing has finished, which can take a while on large files.

---

## How the Audits Work

### Tabular
- Imbalance ratio = largest class count ÷ smallest class count (missing labels count as their own class).
- Duplicates = exact duplicate rows (first occurrence kept).
- Missing % per column; empty or whitespace-only strings are treated as missing.

### Label noise
- Sentence embeddings, then a logistic regression (`C=1`, balanced class weights) with stratified K-fold (up to 5 folds). Classes with fewer than 2 rows are dropped.
- A row is **flagged** when the out-of-fold probability of its given label is below **0.25** and the model prefers a different class.
- **Learnability guard:** if balanced accuracy barely beats chance (signal < 0.15), the labels look unrelated to the text. Per-row flags are suppressed and the label-noise score is set to **30**.
- Score = `100 − 300 × (fraction flagged)`, clamped to 0–100 (5% flagged → 85, 10% → 70, 20% → 40).
- Flags are evidence for human review, not proof of error.

### Semantic consistency
- **Score:** for each row, find its nearest neighbour; neighbours with cosine ≥ 0.85 count as evidence. Score = % of those pairs whose labels agree. Fewer than 5 evidence rows → 100.
- **Issue list:** pairs with cosine > 0.95 and different labels, capped at the 500 strongest.

### Spurious correlations
Chi-square per class on a bag-of-words (English stop words removed, `min_df=2`). Only tokens that are more frequent in the class than overall are returned (top 10 per class).

### Domain suitability
Mean cosine similarity between your intent and up to 50 sampled rows, calibrated from the 0.0–0.5 band onto 0–100. Below 40 triggers a warning.

### Sampling caps

| Check | Row cap |
|---|---|
| Semantic inconsistency pairs | 5,000 |
| Label noise (detect + score) | 2,000 |
| Semantic consistency score | 2,000 |
| Domain relevance | 50 sampled rows |

Sampling is stratified by label and keeps original row indices.

---

## Health Score and Grades

`Overall = 100 − (missing + balance + duplicates + label noise + semantic penalties)`

| Dimension | Penalty | Max |
|---|---|---|
| Missing values | `avg_missing% × 0.20` | 20 |
| Class balance | by imbalance ratio (table below) | 20 |
| Duplicates | `duplicate% × 0.15` | 15 |
| Label noise | `(100 − label_noise_score) × 0.25` | 25 |
| Semantic consistency | `(100 − semantic_score) × 0.20` | 20 |

| Imbalance ratio | Overall penalty | Dashboard sub-score | Advisor severity |
|---|---|---|---|
| ≤ 1.5 | 0 | 100 | none |
| 1.5 – 3 | 5 | 90 | none |
| 3 – 5 | 12 | 70 | INFO |
| 5 – 10 | 18 | 62 | WARNING |
| > 10 | 20 | 20 | CRITICAL |

If text had to be synthesized from features (no real text column), the label-noise and semantic penalties are set to 0. They remain visible, tagged "low confidence".

| Score | Grade |
|---|---|
| ≥ 90 | A |
| ≥ 75 | B |
| ≥ 60 | C |
| < 60 | D |

Dashboard sub-score colors: **> 80** Healthy, **> 60** Needs Attention, otherwise Critical.

---

## Project Structure

```
dataset-quality-auditor/
├── README.md
├── tune_cutoff.py                  # Offline label-noise cutoff tuning tool
├── backend/
│   ├── main.py                     # FastAPI app, CORS, lifespan model pre-warm, routers
│   ├── storage.py                  # In-memory UUID -> bytes store
│   ├── requirements.txt
│   ├── routers/
│   │   ├── tabular.py              # POST /upload, POST /audit
│   │   ├── text.py                 # POST /audit/text
│   │   ├── full_audit.py           # POST /audit/full, /audit/full/stream
│   │   └── chat.py                 # POST /chat
│   ├── schemas/
│   │   ├── tabular_schemas.py      # Upload/audit/report Pydantic models
│   │   └── chat_schemas.py         # Chat request/response models
│   └── services/
│       ├── tabular_service.py      # Pandas structural audit
│       ├── text_service.py         # Embeddings, label noise, consistency, chi-square, domain
│       ├── schema_service.py       # Text/label column inference
│       ├── scorer.py               # Weighted health score and grade
│       ├── advisor.py              # Issues and remediation strategies
│       └── rag_service.py          # Qdrant indexing, search and reranking
└── frontend/
    ├── package.json, vite.config.js, eslint.config.js, index.html
    └── src/
        ├── main.jsx, App.jsx       # Path switch: "/" landing, "/workspace" app
        ├── index.css               # Theme variables, landing page, responsive rules
        ├── pages/LandingPage.jsx
        ├── services/api.js         # Axios + SSE stream reader
        └── components/
            ├── UploadBox.jsx       # Drag-and-drop CSV upload
            ├── AuditForm.jsx       # Mode, column pickers, project intent
            ├── DynamicLoader.jsx   # Loading spinner with rotating status text
            ├── ResultsPanel.jsx    # Tabular and text audit results
            ├── HealthDashboard.jsx # Score ring, sub-scores, issues, strategies, download
            └── DatasetChat.jsx     # "Ask your dataset" search UI
```

---

## Tuning the Label-Noise Cutoff

`tune_cutoff.py` replays already-downloaded reports to see how stricter flagging cutoffs would change the score, precision and recall, without re-running the audit.

```bash
python tune_cutoff.py [report_folder=.] [truth_folder=flip_test]
```

It expects `report_00.json`, `report_05.json`, `report_10.json`, `report_20.json` (audits of a clean file and files with 5/10/20% of labels flipped) and `flip_test/flip_XX_TRUTH.csv` with the flipped row indices.

---

## Known Limitations

- **In-memory storage**: uploads and the Qdrant index are lost on restart. Use Redis/S3 and a persistent Qdrant for production.
- **No authentication or rate limiting**.
- **CSV only**, **single-label classification only**.
- **No image auditing yet.**
- **Sampling caps** apply to large datasets (see above), so text results are representative rather than exhaustive.
- **Duplicates are exact-match only**; near-duplicate texts are caught only through the semantic checks.
- **Topic similarity, not task fit**: Domain Suitability compares topics and can't tell whether your *task* matches the data.
- **Chat index delay**: search results appear only after background indexing finishes.
- **Frontend API URL and CORS ports are hard-coded** for local development.

---

## License

MIT License. Free to use, modify, and deploy for local research or analytical purposes.
