import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from models.database import get_db
from models.user import User
from models.student_analysis import StudentAnalysis
from api.routes_auth import get_current_user
from agents.jd_parser import run_jd_parser
from agents.cv_screener import run_cv_screener
from agents.common import call_llm_text
from agents.cv_advisor import generate_cv_advice
from services.pdf_extractor import extract_cv_text
from config import settings

router = APIRouter(prefix="/api/student", tags=["student"])


class AnalyzeRequest(BaseModel):
    jd_text: str
    cv_text: str


class AnalyzeResponse(BaseModel):
    id: str
    job_title: str
    total_score: float
    skills_score: float
    experience_score: float
    education_score: float
    extras_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    reasoning: str
    suggestions: list[str]
    detailed_advice: list[dict] = []
    fit_verdict: str
    created_at: str


class StudentStatsResponse(BaseModel):
    total_analyses: int
    average_score: float
    highest_score: float
    lowest_score: float
    recent_analyses: list[AnalyzeResponse]


async def _run_analysis(jd_text: str, cv_text: str, user_id: str, db: AsyncSession) -> AnalyzeResponse:
    parsed_jd = await run_jd_parser(jd_text)
    score = await run_cv_screener(cv_text, parsed_jd)

    suggestions_text = await call_llm_text(
        f"""A student's CV was scored {score['total_score']}/100 for a {parsed_jd.get('title', 'job')} position.

Score breakdown:
- Skills: {score.get('skills_score', 0)}/40 (matched: {score.get('matched_skills', [])}, missing: {score.get('missing_skills', [])})
- Experience: {score.get('experience_score', 0)}/30
- Education: {score.get('education_score', 0)}/20
- Extras: {score.get('extras_score', 0)}/10

Give exactly 3 specific, actionable suggestions to improve this CV for this job.
Number them 1, 2, 3. Be concise and direct.""",
        "You are a career coach helping students improve their CVs. Be constructive and specific."
    )

    suggestions = [
        s.strip().lstrip("123.)- ") for s in suggestions_text.split("\n")
        if s.strip() and any(c.isdigit() for c in s[:3])
    ]
    if not suggestions:
        suggestions = [s.strip() for s in suggestions_text.split("\n") if s.strip()][:3]

    detailed_advice = []
    try:
        detailed_advice = await generate_cv_advice(cv_text, parsed_jd, score)
    except Exception:
        pass

    total = score["total_score"]
    if total >= 75:
        fit_verdict = "Strong match — your CV aligns well with this role. Apply confidently."
    elif total >= 50:
        fit_verdict = "Moderate match — you have a solid foundation. Address the gaps listed above to strengthen your application."
    else:
        fit_verdict = "Weak match — significant gaps exist. Focus on the suggested improvements before applying."

    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    analysis = StudentAnalysis(
        id=analysis_id,
        user_id=user_id,
        job_title=parsed_jd.get("title", "Job Position"),
        jd_text=jd_text,
        cv_text=cv_text,
        total_score=score["total_score"],
        skills_score=score.get("skills_score", 0),
        experience_score=score.get("experience_score", 0),
        education_score=score.get("education_score", 0),
        extras_score=score.get("extras_score", 0),
        matched_skills=score.get("matched_skills", []),
        missing_skills=score.get("missing_skills", []),
        reasoning=score.get("reasoning", ""),
        suggestions=suggestions,
        detailed_advice=detailed_advice,
        fit_verdict=fit_verdict,
        created_at=now,
    )
    db.add(analysis)
    await db.commit()

    return AnalyzeResponse(
        id=analysis_id,
        job_title=parsed_jd.get("title", "Job Position"),
        total_score=score["total_score"],
        skills_score=score.get("skills_score", 0),
        experience_score=score.get("experience_score", 0),
        education_score=score.get("education_score", 0),
        extras_score=score.get("extras_score", 0),
        matched_skills=score.get("matched_skills", []),
        missing_skills=score.get("missing_skills", []),
        reasoning=score.get("reasoning", ""),
        suggestions=suggestions,
        detailed_advice=detailed_advice,
        fit_verdict=fit_verdict,
        created_at=now.isoformat(),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_cv(
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "student":
        raise HTTPException(403, "Only students can access this feature")
    if not body.jd_text.strip():
        raise HTTPException(400, "Job description cannot be empty")
    if not body.cv_text.strip():
        raise HTTPException(400, "CV text cannot be empty")
    return await _run_analysis(body.jd_text, body.cv_text, user.id, db)


@router.post("/analyze-upload", response_model=AnalyzeResponse)
async def analyze_cv_upload(
    jd_text: str = Form(...),
    cv_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "student":
        raise HTTPException(403, "Only students can access this feature")
    if not jd_text.strip():
        raise HTTPException(400, "Job description cannot be empty")

    ext = os.path.splitext(cv_file.filename)[1] or ".txt"
    file_id = str(uuid.uuid4())
    save_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{ext}")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    content = await cv_file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    cv_text = extract_cv_text(save_path)
    os.remove(save_path)

    if not cv_text.strip():
        raise HTTPException(400, "Could not extract text from the uploaded file")

    return await _run_analysis(jd_text, cv_text, user.id, db)


@router.get("/stats", response_model=StudentStatsResponse)
async def student_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "student":
        raise HTTPException(403, "Only students can access this feature")

    count_result = await db.execute(
        select(func.count(StudentAnalysis.id)).where(StudentAnalysis.user_id == user.id)
    )
    total = count_result.scalar() or 0

    avg_result = await db.execute(
        select(func.avg(StudentAnalysis.total_score)).where(StudentAnalysis.user_id == user.id)
    )
    avg_score = round(avg_result.scalar() or 0, 1)

    max_result = await db.execute(
        select(func.max(StudentAnalysis.total_score)).where(StudentAnalysis.user_id == user.id)
    )
    highest = round(max_result.scalar() or 0, 1)

    min_result = await db.execute(
        select(func.min(StudentAnalysis.total_score)).where(StudentAnalysis.user_id == user.id)
    )
    lowest = round(min_result.scalar() or 0, 1)

    recent_result = await db.execute(
        select(StudentAnalysis)
        .where(StudentAnalysis.user_id == user.id)
        .order_by(StudentAnalysis.created_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    return StudentStatsResponse(
        total_analyses=total,
        average_score=avg_score,
        highest_score=highest,
        lowest_score=lowest,
        recent_analyses=[
            AnalyzeResponse(
                id=a.id,
                job_title=a.job_title or "",
                total_score=a.total_score,
                skills_score=a.skills_score,
                experience_score=a.experience_score,
                education_score=a.education_score,
                extras_score=a.extras_score,
                matched_skills=a.matched_skills or [],
                missing_skills=a.missing_skills or [],
                reasoning=a.reasoning or "",
                suggestions=a.suggestions or [],
                detailed_advice=a.detailed_advice or [],
                fit_verdict=a.fit_verdict or "",
                created_at=a.created_at.isoformat() if a.created_at else "",
            )
            for a in recent
        ],
    )
