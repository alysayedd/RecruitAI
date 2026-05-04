import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db
from models.schemas import JobPosting, JobCreate, JobResponse
from agents.jd_parser import run_jd_parser
from datetime import datetime

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse)
async def create_job(body: JobCreate, db: AsyncSession = Depends(get_db)):
    if not body.jd_text.strip():
        raise HTTPException(400, "JD text cannot be empty")

    parsed = await run_jd_parser(body.jd_text)
    job = JobPosting(
        id=str(uuid.uuid4()),
        title=parsed.get("title", "Job Position"),
        raw_jd_text=body.jd_text,
        parsed_jd=parsed,
        status="ready",
        created_at=datetime.utcnow(),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPosting).order_by(JobPosting.created_at.desc()))
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return job
