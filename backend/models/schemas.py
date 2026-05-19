from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List, Any
from models.database import Base


# ── SQLAlchemy ORM Models ──────────────────────────────────────────────────────

class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    raw_jd_text = Column(Text, nullable=False)
    parsed_jd = Column(JSON, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    candidates = relationship("Candidate", back_populates="job")
    bias_reports = relationship("BiasReport", back_populates="job")
    rankings = relationship("Ranking", back_populates="job")


class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("job_postings.id"), nullable=False)
    filename = Column(String, nullable=False)
    raw_cv_text = Column(Text, nullable=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    job = relationship("JobPosting", back_populates="candidates")
    screening_result = relationship("ScreeningResult", back_populates="candidate", uselist=False)
    ranking = relationship("Ranking", back_populates="candidate", uselist=False)


class ScreeningResult(Base):
    __tablename__ = "screening_results"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(String, ForeignKey("job_postings.id"), nullable=False)
    total_score = Column(Float, default=0)
    score_breakdown = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    candidate = relationship("Candidate", back_populates="screening_result")


class BiasReport(Base):
    __tablename__ = "bias_reports"
    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("job_postings.id"), nullable=False)
    report_data = Column(JSON, nullable=True)
    overall_bias_score = Column(Float, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    job = relationship("JobPosting", back_populates="bias_reports")


class Ranking(Base):
    __tablename__ = "rankings"
    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("job_postings.id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    rank = Column(Integer, nullable=False)
    raw_score = Column(Float, default=0)
    adjusted_score = Column(Float, default=0)
    shortlisted = Column(Boolean, default=False)
    bias_corrected = Column(Boolean, default=False)
    job = relationship("JobPosting", back_populates="rankings")
    candidate = relationship("Candidate", back_populates="ranking")


# ── Pydantic Request/Response Models ──────────────────────────────────────────

class JobCreate(BaseModel):
    jd_text: str

class JobResponse(BaseModel):
    id: str
    title: str
    status: str
    parsed_jd: Optional[Any] = None
    created_at: datetime
    class Config:
        from_attributes = True

class UserJobCreate(BaseModel):
    jd_text: str

class CandidateResponse(BaseModel):
    id: str
    filename: str
    name: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ScoreBreakdown(BaseModel):
    skills_score: float
    experience_score: float
    education_score: float
    extras_score: float
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    reasoning: str = ""

class RankingResponse(BaseModel):
    rank: int
    candidate_id: str
    candidate_name: Optional[str] = None
    filename: str
    raw_score: float
    adjusted_score: float
    shortlisted: bool
    bias_corrected: bool
    score_breakdown: Optional[Any] = None
    explanation: Optional[str] = None

class BiasReportResponse(BaseModel):
    gender_dir: float
    name_origin_dir: float
    university_bias_detected: bool
    shap_top_features: List[Any]
    flagged_candidates: List[str]
    overall_bias_score: float
    recommendations: List[str]

class FullResultsResponse(BaseModel):
    job_id: str
    job_title: str
    total_candidates: int
    shortlisted_count: int
    rankings: List[RankingResponse]
    bias_report: Optional[Any] = None
    batch_summary: Optional[str] = None
