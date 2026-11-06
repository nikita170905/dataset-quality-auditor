from fastapi import APIRouter, HTTPException, status

from schemas.chat_schemas import ChatRequest, ChatResponse
from services.rag_service import search_dataset

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_dataset(request: ChatRequest) -> ChatResponse:
    """Search the indexed dataset for rows relevant to a natural-language query."""
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty.",
        )

    matches = search_dataset(request.file_id, request.query, request.top_k)
    return ChatResponse(matches=matches)
