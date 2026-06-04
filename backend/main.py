from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.tabular import router as tabular_router

app = FastAPI(title="Multimodal Dataset Auditor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tabular_router, prefix="", tags=["tabular"])
