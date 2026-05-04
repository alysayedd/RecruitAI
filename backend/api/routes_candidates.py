import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from models.database import get_db
from models.schemas import Candidate, JobPosting, CandidateResponse
from services.pdf_extractor import extract_cv_text
from config import settings
from datetime import datetime
import aiofiles

router = APIRouter(prefix="/api/jobs", tags=["candidates"])


@router.post("/{job_id}/candidates", response_model=List[CandidateResponse])
async def upload_candidates(
    job_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    created = []

    for file in files:
        candidate_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1] or ".txt"
        save_path = os.path.join(settings.UPLOAD_DIR, f"{candidate_id}{ext}")

        # Save file
        async with aiofiles.open(save_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        # Extract text
        cv_text = extract_cv_text(save_path)

        # Try to extract name from filename (e.g. "Ahmed_Mohamed_CV.pdf")
        name_guess = os.path.splitext(file.filename)[0].replace("_", " ").replace("-", " ")

        candidate = Candidate(
            id=candidate_id,
            job_id=job_id,
            filename=file.filename,
            raw_cv_text=cv_text,
            name=name_guess,
            created_at=datetime.utcnow(),
        )
        db.add(candidate)
        created.append(candidate)

    await db.commit()
    for c in created:
        await db.refresh(c)

    return created


@router.get("/{job_id}/candidates", response_model=List[CandidateResponse])
async def list_candidates(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    return result.scalars().all()
