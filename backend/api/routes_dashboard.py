from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models.database import get_db
from models.schemas import JobPosting, Candidate, Ranking, BiasReport
from models.user import User
from api.routes_auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class HRStatsResponse(BaseModel):
    total_jobs: int
    jobs_completed: int
    jobs_running: int
    jobs_ready: int
    jobs_error: int
    total_candidates: int
    total_shortlisted: int
    average_bias_score: float
    recent_jobs: list[dict]


@router.get("/hr", response_model=HRStatsResponse)
async def hr_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "hr":
        raise HTTPException(403, "Only HR users can access this")

    jobs_result = await db.execute(
        select(JobPosting).where(JobPosting.user_id == user.id)
    )
    jobs = jobs_result.scalars().all()
    total_jobs = len(jobs)
    job_ids = [j.id for j in jobs]

    statuses = {"complete": 0, "running": 0, "ready": 0, "pending": 0, "error": 0}
    for j in jobs:
        s = j.status or "ready"
        if s in statuses:
            statuses[s] += 1

    if job_ids:
        shortlist_result = await db.execute(
            select(func.count(Ranking.id)).where(
                Ranking.job_id.in_(job_ids), Ranking.shortlisted == True
            )
        )
        total_shortlisted = shortlist_result.scalar() or 0

        cand_result = await db.execute(
            select(func.count(Candidate.id)).where(Candidate.job_id.in_(job_ids))
        )
        total_candidates = cand_result.scalar() or 0

        bias_result = await db.execute(
            select(func.avg(BiasReport.overall_bias_score)).where(
                BiasReport.job_id.in_(job_ids)
            )
        )
        avg_bias = round(bias_result.scalar() or 0, 1)
    else:
        total_shortlisted = 0
        total_candidates = 0
        avg_bias = 0.0

    recent = sorted(jobs, key=lambda j: j.created_at or datetime.min, reverse=True)[:10]

    return HRStatsResponse(
        total_jobs=total_jobs,
        jobs_completed=statuses["complete"],
        jobs_running=statuses["running"],
        jobs_ready=statuses["ready"],
        jobs_error=statuses["error"],
        total_candidates=total_candidates,
        total_shortlisted=total_shortlisted,
        average_bias_score=avg_bias,
        recent_jobs=[
            {"id": j.id, "title": j.title, "status": j.status or "ready"}
            for j in recent
        ],
    )
