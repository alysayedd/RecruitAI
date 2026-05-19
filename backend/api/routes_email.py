import asyncio
import re
import smtplib
from datetime import datetime
from email.message import EmailMessage
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.database import get_db
from models.schemas import JobPosting, Candidate, ScreeningResult, Ranking
from models.user import User
from api.routes_auth import get_current_user
from agents.email_drafter import draft_email
from config import settings

router = APIRouter(prefix="/api/jobs", tags=["email"])


class EmailDraftRequest(BaseModel):
    email_type: str
    interview_time: str | None = None


class EmailDraftResponse(BaseModel):
    candidate_id: str
    candidate_name: str
    email_type: str
    subject: str
    body: str


class EmailSendRequest(BaseModel):
    email_type: str
    subject: str
    body: str
    interview_time: str | None = None


class EmailSendResponse(BaseModel):
    sent: bool
    status: str
    message: str
    recipient_email: str
    mailto_url: str | None = None


def _company_name_for_user(user: User) -> str:
    if user.company_name and user.company_name.strip():
        return user.company_name.strip()

    domain = user.email.split("@", 1)[1].split(".", 1)[0] if "@" in user.email else ""
    return domain.replace("-", " ").replace("_", " ").title() or "our company"


def _format_interview_time(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
        return parsed.strftime("%B %d, %Y at %I:%M %p")
    except ValueError:
        return value


def _extract_candidate_email(candidate: Candidate) -> str | None:
    text = candidate.raw_cv_text or ""
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else None


def _mailto_url(recipient: str, subject: str, body: str) -> str:
    return f"mailto:{quote(recipient)}?subject={quote(subject)}&body={quote(body)}"


async def _get_email_context(job_id: str, candidate_id: str, db: AsyncSession, user: User):
    job_result = await db.execute(
        select(JobPosting).where(JobPosting.id == job_id, JobPosting.user_id == user.id)
    )
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    row = await db.execute(
        select(Ranking, Candidate, ScreeningResult)
        .join(Candidate, Ranking.candidate_id == Candidate.id)
        .outerjoin(
            ScreeningResult,
            and_(
                ScreeningResult.candidate_id == Candidate.id,
                ScreeningResult.job_id == job_id,
            ),
        )
        .where(Ranking.job_id == job_id, Ranking.candidate_id == candidate_id)
    )
    result = row.first()
    if not result:
        raise HTTPException(404, "Candidate not found in this job's results")

    return job, *result


def _send_with_smtp(recipient: str, subject: str, body: str, user: User) -> None:
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    if not settings.SMTP_HOST or not from_email:
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    sender_name = settings.SMTP_FROM_NAME or user.name
    message["From"] = f"{sender_name} <{from_email}>"
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)


@router.post("/{job_id}/candidates/{candidate_id}/draft-email", response_model=EmailDraftResponse)
async def create_email_draft(
    job_id: str,
    candidate_id: str,
    body: EmailDraftRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.email_type not in ("rejection", "next_step"):
        raise HTTPException(400, "email_type must be 'rejection' or 'next_step'")
    if body.email_type == "next_step" and not body.interview_time:
        raise HTTPException(400, "Interview time is required for next-step emails")

    job, ranking, candidate, screening = await _get_email_context(job_id, candidate_id, db, user)
    sb = screening.score_breakdown if screening else {}

    draft = await draft_email(
        candidate_name=candidate.name or candidate.filename,
        job_title=job.title,
        email_type=body.email_type,
        score=ranking.adjusted_score,
        explanation=screening.explanation if screening else "",
        matched_skills=sb.get("matched_skills", []),
        missing_skills=sb.get("missing_skills", []),
        hr_name=user.name,
        company_name=_company_name_for_user(user),
        interview_time=_format_interview_time(body.interview_time),
    )

    return EmailDraftResponse(
        candidate_id=candidate_id,
        candidate_name=candidate.name or candidate.filename,
        **draft,
    )


@router.post("/{job_id}/candidates/{candidate_id}/send-email", response_model=EmailSendResponse)
async def send_candidate_email(
    job_id: str,
    candidate_id: str,
    body: EmailSendRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.email_type not in ("rejection", "next_step"):
        raise HTTPException(400, "email_type must be 'rejection' or 'next_step'")
    if body.email_type == "next_step" and not body.interview_time:
        raise HTTPException(400, "Interview time is required before sending this email")
    if not body.subject.strip() or not body.body.strip():
        raise HTTPException(400, "Subject and body are required")

    _, _, candidate, _ = await _get_email_context(job_id, candidate_id, db, user)
    recipient = _extract_candidate_email(candidate)
    if not recipient:
        raise HTTPException(400, "Candidate email address was not found in the uploaded CV")

    subject = body.subject.strip()
    email_body = body.body.strip()
    mailto = _mailto_url(recipient, subject, email_body)

    if not settings.SMTP_HOST:
        return EmailSendResponse(
            sent=False,
            status="not_configured",
            message="SMTP is not configured. The email is ready in your mail app instead.",
            recipient_email=recipient,
            mailto_url=mailto,
        )

    try:
        await asyncio.to_thread(_send_with_smtp, recipient, subject, email_body, user)
    except Exception as exc:
        raise HTTPException(502, f"Email could not be sent: {exc}") from exc

    return EmailSendResponse(
        sent=True,
        status="sent",
        message="Email sent successfully",
        recipient_email=recipient,
    )
