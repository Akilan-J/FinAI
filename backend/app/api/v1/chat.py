import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from app.api import deps
from app.db.session import async_session_maker
from app.models.user import User
from app.models.chat_message import ChatMessage as ChatMessageModel
from app.services.chat_agent import stream_chat_response
from pydantic import BaseModel

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

@router.get("/history")
async def get_chat_history(
    current_user: User = Depends(deps.get_current_user)
):
    async with async_session_maker() as db:
        # Filter for messages created within the last 7 days
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        result = await db.execute(
            select(ChatMessageModel)
            .where(
                ChatMessageModel.user_id == current_user.id,
                ChatMessageModel.created_at >= seven_days_ago
            )
            .order_by(ChatMessageModel.created_at.asc())
        )
        messages = result.scalars().all()
        return {
            "success": True,
            "data": [
                {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        }

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
                
                # Save user's new message to the database
                user_msg = ChatMessageModel(
                    user_id=current_user.id,
                    role="user",
                    content=dict_messages[-1]["content"]
                )
                db.add(user_msg)
                await db.commit()

                full_reply = ""
                async for chunk in stream_chat_response(dict_messages, db, current_user.id):
                    full_reply += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save chatbot response to the database
                if full_reply.strip():
                    asst_msg = ChatMessageModel(
                        user_id=current_user.id,
                        role="model",
                        content=full_reply
                    )
                    db.add(asst_msg)
                    await db.commit()
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
