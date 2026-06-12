# Dataset Quality Auditor

A multimodal dataset health evaluation platform built with **FastAPI** and **React**. Upload any CSV dataset and receive a structured audit report covering class imbalance, label noise, duplicate detection, missing values, and semantic inconsistencies — with a weighted health score and prioritized fix list.

> **Status:** MVP complete (Phases 1–2 and 4). Phase 3 (image dataset auditing) is scoped for future development.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Audit Metrics Explained](#audit-metrics-explained)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Overview

**The problem:** Machine learning teams routinely waste weeks training models on flawed datasets — mislabeled samples, severe class imbalances, duplicate records, and inconsistent annotations. No unified, free tool existed to systematically diagnose these issues before training begins.

**What this builds:** A pipeline that accepts a CSV dataset, runs statistical and NLP-based quality checks, and returns a `0–100` Dataset Health Score with a ranked list of detected issues and concrete remediation strategies.

**Who it's for:** Any ML or data science team building classification models on tabular or text data.

---

## Features

### Backend
- **Tabular Auditor** — class distribution, imbalance ratio, duplicate detection, missing value analysis
- **Text NLP Auditor** — semantic inconsistency detection (via sentence embeddings), label noise estimation (via Cleanlab + confident learning), spurious token correlation (Chi-Square)
- **Health Scoring Engine** — weighted penalty formula mapping defects to a 0–100 score with grade (A/B/C/D)
- **Rule-Based Advisor** — deterministic issue prioritization (CRITICAL / WARNING / INFO) with fix suggestions and augmentation strategies
- **Model Singleton** — `SentenceTransformer` loads once at server startup, cached in memory for all subsequent requests
- **Parallel Execution** — NLP sub-audits run concurrently via `asyncio.gather` + `ThreadPoolExecutor`, reducing text audit time by ~60%
- **Stratified Sampling** — large datasets (>5,000 rows) are sampled with class-proportion preservation before NLP processing
- **SSE Progress Streaming** — Server-Sent Events push real-time progress to the frontend during long-running audits


---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 React Frontend                   │
│  UploadBox → AuditForm → HealthDashboard         │
│  SSE consumer → real-time progress bar           │
└────────────────────┬────────────────────────────┘
                     │ HTTP / SSE
┌────────────────────▼────────────────────────────┐
│               FastAPI Backend                    │
│                                                  │
│  POST /api/upload        → storage.py (UUID map) │
│  POST /api/audit         → tabular audit         │
│  POST /api/audit/text    → text audit            │
│  POST /api/audit/full    → combined pipeline     │
│  POST /api/audit/full/stream → SSE stream        │
└──────┬──────────────┬───────────────┬────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────┐
│tabular_     │ │text_       │ │scorer.py       │
│service.py   │ │service.py  │ │advisor.py      │
│(pandas)     │ │(ST + CL)   │ │(rule engine)   │
└─────────────┘ └────────────┘ └────────────────┘
```

**Key design rule:** Service layer files (`tabular_service.py`, `text_service.py`, `scorer.py`, `advisor.py`) have zero FastAPI imports — they are pure Python/Pandas and independently testable.

### Data Flow

1. User uploads CSV → stored as raw bytes in an in-memory UUID-keyed dictionary
2. User selects audit mode and provides column names
3. Backend runs tabular audit (mandatory) + text audit (if text column provided)
4. Scorer applies weighted penalty formula → overall score + grade
5. Advisor generates ranked issue list + augmentation strategies
6. Frontend renders full report; user can download as JSON

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Python 3.11, FastAPI, Uvicorn |
| Data processing | Pandas, NumPy |
| ML / NLP | Scikit-learn, Sentence-Transformers (`all-MiniLM-L6-v2`), Cleanlab |
| Frontend | React 19, Vite |
| Charting | Recharts |
| Styling | Vanilla CSS with custom variable system |
| Concurrency | `asyncio`, `ThreadPoolExecutor` |
| Streaming | Server-Sent Events (SSE) |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- ~500 MB disk space (for `all-MiniLM-L6-v2` model weights, downloaded once)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The server starts at `http://localhost:8000`.

On first startup, the lifespan hook downloads and caches the sentence-transformer model. Subsequent restarts use the locally cached weights.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Usage Guide

### Step 1 — Upload Dataset
Drag and drop any `.csv` file into the upload zone. A UUID token confirms successful ingestion.

### Step 2 — Configure Audit
Select an audit mode:

| Mode | What it runs | Required inputs |
|---|---|---|
| **Tabular Auditor** | Structural stats only | Label column |
| **Text NLP Auditor** | NLP checks only | Label column + Text column |
| **Full Dataset Audit** | Both pipelines + health score | Label column + Text column |

### Step 3 — Run Audit
Click **Run Audit**. A progress bar streams real-time stage updates for large datasets. Typical runtimes:

| Dataset size | Tabular only | Full audit |
|---|---|---|
| < 2,000 rows | < 5 seconds | 20–40 seconds |
| 2,000–10,000 rows | < 10 seconds | 60–90 seconds |
| > 10,000 rows | < 15 seconds | 90–150 seconds (sampled) |

### Step 4 — Review Results
The dashboard shows:
- Health score gauge (0–100) with letter grade
- Per-dimension score breakdown
- Prioritized issue list with fix suggestions
- Augmentation and remediation strategies
- JSON download button for full report

---

## Audit Metrics Explained

### Health Score Formula

```
Score = 100 − Σ penalties

Penalty weights:
  Missing Values      → 0.20 (max 20 pts deducted)
  Class Imbalance     → 0.20 (max 20 pts deducted)
  Duplicates          → 0.15 (max 15 pts deducted)
  Label Noise         → 0.25 (max 25 pts deducted)  [text only]
  Semantic Consistency→ 0.20 (max 20 pts deducted)  [text only]
```

### Grade Thresholds

| Score | Grade | Interpretation |
|---|---|---|
| ≥ 90 | A | Healthy — minor issues only |
| ≥ 75 | B | Good — some improvements recommended |
| ≥ 60 | C | Moderate — notable issues affecting model quality |
| < 60 | D | Poor — critical issues requiring attention before training |

### Imbalance Ratio Severity

| Ratio | Severity | Score Impact |
|---|---|---|
| ≤ 3.0 | None | 0 pts |
| 3.0 – 5.0 | INFO | −5 pts |
| 5.0 – 10.0 | WARNING | −12 pts |
| > 10.0 | CRITICAL | −20 pts |

> **Note:** Text audit metrics (Label Noise, Semantic Consistency) are computed on a stratified sample of up to 5,000 rows for datasets exceeding that size. Sample coverage is noted in the JSON report.

---


## Project Structure

```
project/
├── backend/
│   ├── main.py                     # FastAPI app, lifespan hook, router mounts
│   ├── storage.py                  # In-memory UUID → bytes file store
│   ├── routers/
│   │   ├── tabular.py              # POST /upload, POST /audit
│   │   ├── text.py                 # POST /audit/text
│   │   └── full_audit.py           # POST /audit/full, POST /audit/full/stream
│   ├── services/
│   │   ├── tabular_service.py      # Pandas-based structural audit
│   │   ├── text_service.py         # Embeddings, label noise, chi-square
│   │   ├── scorer.py               # Weighted health score formula
│   │   └── advisor.py              # Rule-based issue + strategy generator
│   ├── schemas/
│   │   └── tabular_schemas.py      # All Pydantic v2 request/response models
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx                 # State orchestrator, SSE consumer
│       ├── services/
│       │   └── api.js              # Fetch wrappers for all endpoints
│       └── components/
│           ├── UploadBox.jsx       # Drag-and-drop file ingestion
│           ├── AuditForm.jsx       # Column input + audit mode toggle
│           ├── ResultsPanel.jsx    # Tabular audit results display
│           └── HealthDashboard.jsx # Full audit health report
└── README.md
```

---

## Known Limitations

- **In-memory storage only** — uploaded files are lost on server restart. Production deployments should use Redis or S3.
- **No authentication** — the API has no rate limiting or auth layer. Not suitable for public deployment as-is.
- **NLP sampling cap** — text audits are capped at 5,000 rows for semantic checks and 2,000 rows for label noise detection. Results on large datasets are statistically representative but not exhaustive.
- **Single-label classification only** — multi-label datasets are not currently supported.
- **CSV only** — JSON, Parquet, and Excel formats are not yet supported.

---

## License

MIT License. Free to use, modify, and deploy for local research or analytical purposes.
