import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import full_audit, tabular, text
from services.text_service import get_embedding_model

# Setup core logging parameters
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles hot startup sequences to pre-warm structural machine learning models

    before routing network connections.
    """
    logger.info("Pre-warming embedding model...")
    try:
        get_embedding_model()
        logger.info("Embedding model ready and cached in RAM successfully.")
    except Exception as e:
        logger.error(f"Failed to pre-warm embedding model on startup: {e}", exc_info=True)
    yield

app = FastAPI(
    title="Multimodal Dataset Auditor", 
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"message": "Dataset Quality Auditor backend is running."}

# Mount existing core architectural pipeline routes
app.include_router(tabular.router, prefix="/api")
app.include_router(text.router, prefix="/api")
app.include_router(full_audit.router, prefix="/api")