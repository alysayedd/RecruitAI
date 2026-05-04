import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_

from models.database import get_db, AsyncSessionLocal
from models.schemas import (
    JobPosting, Candidate, ScreeningResult, BiasReport, Ranking,
)
from agents.orchestrator import run_pipeline
from services.report_generator import generate_report

router = APIRouter(prefix="/api/jobs", tags=["results"])


@router.post("/{job_id}/run")
async def run_screening(job_id: str, db: AsyncSession = Depends(get_db)):
    """Run the full pipeline and stream progress via SSE."""
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    cands_result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    candidates = cands_result.scalars().all()
    if not candidates:
        raise HTTPException(400, "No candidates uploaded for this job")

    candidates_input = [
        {"candidate_id": c.id, "name": c.name, "filename": c.filename, "cv_text": c.raw_cv_text or ""}
        for c in candidates
    ]

    # Update job status
    job.status = "running"
    await db.commit()

    async def event_stream():
        final_results = {}
        async for event in run_pipeline(job_id, job.raw_jd_text, candidates_input):
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("step") == "done":
                final_results = event.get("data", {}).get("results", {})

        # Persist in a fresh session so we are not tied to the request-scoped session
        # lifecycle, and so "saved" is only emitted after a successful commit.
        try:
            parsed_jd = final_results.get("parsed_jd", {})
            exps = final_results.get("explanations", {}).get("candidate_explanations", {})

            async with AsyncSessionLocal() as persist_db:
                job_row = await persist_db.get(JobPosting, job_id)
                if not job_row:
                    raise RuntimeError("Job not found while saving results")

                job_row.parsed_jd = parsed_jd
                job_row.status = "complete"

                # Replace prior run data (avoids duplicate rows / scalar_one errors on re-run)
                await persist_db.execute(delete(Ranking).where(Ranking.job_id == job_id))
                await persist_db.execute(delete(ScreeningResult).where(ScreeningResult.job_id == job_id))
                await persist_db.execute(delete(BiasReport).where(BiasReport.job_id == job_id))
                await persist_db.flush()

                for screened in final_results.get("screened", []):
                    cid = screened["candidate_id"]
                    sr = ScreeningResult(
                        id=str(uuid.uuid4()),
                        candidate_id=cid,
                        job_id=job_id,
                        total_score=screened.get("total_score", 0),
                        score_breakdown=screened.get("score_breakdown", {}),
                        reasoning=screened.get("score_breakdown", {}).get("reasoning", ""),
                        explanation=str(exps.get(cid, "")),
                    )
                    persist_db.add(sr)

                bias_data = final_results.get("bias_report", {})
                br = BiasReport(
                    id=str(uuid.uuid4()),
                    job_id=job_id,
                    report_data=bias_data,
                    overall_bias_score=bias_data.get("overall_bias_score", 0),
                )
                persist_db.add(br)

                for r in final_results.get("rankings", []):
                    rk = Ranking(
                        id=str(uuid.uuid4()),
                        job_id=job_id,
                        candidate_id=r["candidate_id"],
                        rank=r["rank"],
                        raw_score=r["raw_score"],
                        adjusted_score=r["adjusted_score"],
                        shortlisted=r["shortlisted"],
                        bias_corrected=r["bias_corrected"],
                    )
                    persist_db.add(rk)

                await persist_db.commit()

            yield f"data: {json.dumps({'step': 'saved', 'message': 'Results saved to database'})}\n\n"
        except Exception as e:
            async with AsyncSessionLocal() as err_db:
                job_row = await err_db.get(JobPosting, job_id)
                if job_row:
                    job_row.status = "error"
                    await err_db.commit()
            yield f"data: {json.dumps({'step': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{job_id}/results")
async def get_results(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    rankings_result = await db.execute(
        select(Ranking, Candidate, ScreeningResult)
        .join(Candidate, Ranking.candidate_id == Candidate.id)
        .outerjoin(
            ScreeningResult,
            and_(
                ScreeningResult.candidate_id == Candidate.id,
                ScreeningResult.job_id == job_id,
            ),
        )
        .where(Ranking.job_id == job_id)
        .order_by(Ranking.rank)
    )
    rows = rankings_result.all()

    bias_result = await db.execute(
        select(BiasReport)
        .where(BiasReport.job_id == job_id)
        .order_by(BiasReport.created_at.desc())
        .limit(1)
    )
    bias_report = bias_result.scalars().first()

    rankings_out = []
    for ranking, candidate, screening in rows:
        rankings_out.append({
            "rank": ranking.rank,
            "candidate_id": ranking.candidate_id,
            "candidate_name": candidate.name,
            "filename": candidate.filename,
            "raw_score": ranking.raw_score,
            "adjusted_score": ranking.adjusted_score,
            "shortlisted": ranking.shortlisted,
            "bias_corrected": ranking.bias_corrected,
            "score_breakdown": screening.score_breakdown if screening else {},
            "explanation": screening.explanation if screening else "",
        })

    return {
        "job_id": job_id,
        "job_title": job.title,
        "status": job.status,
        "parsed_jd": job.parsed_jd,
        "total_candidates": len(rankings_out),
        "shortlisted_count": sum(1 for r in rankings_out if r["shortlisted"]),
        "rankings": rankings_out,
        "bias_report": bias_report.report_data if bias_report else None,
        "overall_bias_score": bias_report.overall_bias_score if bias_report else None,
    }


@router.get("/{job_id}/report")
async def download_report(job_id: str, db: AsyncSession = Depends(get_db)):
    """Generate and return PDF report."""
    data = await get_results(job_id, db)

    bias_report = data.get("bias_report") or {}
    rankings = data.get("rankings", [])
    explanations = {"batch_summary": "", "bias_narrative": "", "candidate_explanations": {
        r["candidate_id"]: r.get("explanation", "") for r in rankings
    }}

    pdf_bytes = generate_report(data["job_title"], rankings, bias_report, explanations)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{job_id[:8]}.pdf"},
    )
