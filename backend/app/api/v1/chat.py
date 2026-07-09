import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.api import deps
from app.db.session import async_session_maker
from app.models.user import User
from app.services.chat_agent import stream_chat_response
from pydantic import BaseModel

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(deps.get_current_user)
):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")

    async def event_generator():
        # Open database session in generator to keep it alive during streaming execution
        async with async_session_maker() as db:
            try:
                dict_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
                async for chunk in stream_chat_response(dict_messages, db, current_user.id):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
