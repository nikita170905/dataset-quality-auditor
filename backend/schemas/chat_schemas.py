from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    file_id: str
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class ChatMatch(BaseModel):
    text: str
    score: float
    row_index: int


class ChatResponse(BaseModel):
    matches: list[ChatMatch]
