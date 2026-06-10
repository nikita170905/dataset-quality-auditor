from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.tabular import router as tabular_router
from routers.text import router as text_router

app = FastAPI(title="Multimodal Dataset Auditor", version="0.1.0")

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

app.include_router(tabular_router, prefix="", tags=["tabular"])
app.include_router(text_router, prefix="/api", tags=["Text Audit"])
