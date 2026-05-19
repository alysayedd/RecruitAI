import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.schemas import JobPosting, JobResponse, UserJobCreate
from models.user import User
from api.routes_auth import get_current_user
from agents.jd_parser import run_jd_parser
from services.jd_scraper import scrape_jd_from_url
from datetime import datetime, timezone
from pydantic import BaseModel as _BaseModel

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class _ScrapeUrlRequest(_BaseModel):
    url: str


@router.post("/scrape-url")
async def scrape_job_url(
    body: _ScrapeUrlRequest,
    user: User = Depends(get_current_user),
):
    if not body.url.strip():
        raise HTTPException(400, "URL cannot be empty")
    return await scrape_jd_from_url(body.url.strip())


@router.post("", response_model=JobResponse)
async def create_job(
    body: UserJobCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.jd_text.strip():
        raise HTTPException(400, "JD text cannot be empty")

    parsed = await run_jd_parser(body.jd_text)
    job = JobPosting(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=parsed.get("title", "Job Position"),
        raw_jd_text=body.jd_text,
        parsed_jd=parsed,
        status="ready",
        created_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobPosting)
        .where(JobPosting.user_id == user.id)
        .order_by(JobPosting.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == job_id, JobPosting.user_id == user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return job
