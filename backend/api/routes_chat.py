from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from models.database import get_db
from models.user import User
from models.chat_message import ChatMessage
from api.routes_auth import get_current_user
from agents.common import call_llm_text

router = APIRouter(prefix="/api/chat", tags=["chat"])

HR_SYSTEM = (
    "You are an expert HR recruitment assistant. You help HR professionals with:\n"
    "- Writing and refining job descriptions\n"
    "- Designing unbiased screening criteria\n"
    "- Understanding bias audit reports (DIR scores, flagged candidates)\n"
    "- Interpreting candidate rankings and score breakdowns\n"
    "- Suggesting fair shortlisting strategies\n"
    "- Explaining recruitment best practices\n\n"
    "Be concise, professional, and data-driven. Reference bias-aware recruiting principles."
)

STUDENT_SYSTEM = (
    "You are a career coach and CV consultant. You help students with:\n"
    "- Improving their CVs and resumes for specific roles\n"
    "- Identifying skill gaps and suggesting courses/projects to fill them\n"
    "- Understanding job descriptions and what employers look for\n"
    "- Preparing for interviews and building a portfolio\n"
    "- Career path advice based on their qualifications\n"
    "- Explaining how ATS screening works and how to optimize for it\n\n"
    "Be encouraging, constructive, and specific. Give actionable advice."
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class ChatHistoryItem(BaseModel):
    id: int
    message: str
    response: str
    created_at: str


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    system = STUDENT_SYSTEM if user.role == "student" else HR_SYSTEM
    prompt = body.message.strip()

    answer = await call_llm_text(prompt, system)

    chat_msg = ChatMessage(
        user_id=user.id,
        role=user.role,
        message=prompt,
        response=answer,
        created_at=datetime.now(timezone.utc),
    )
    db.add(chat_msg)
    await db.commit()

    return ChatResponse(response=answer)


@router.get("/history", response_model=list[ChatHistoryItem])
async def chat_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
    )
    messages = result.scalars().all()
    return [
        ChatHistoryItem(
            id=m.id,
            message=m.message,
            response=m.response,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in reversed(messages)
    ]
