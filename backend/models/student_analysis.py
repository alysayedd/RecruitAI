from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON
from datetime import datetime, timezone
from models.database import Base


class StudentAnalysis(Base):
    __tablename__ = "student_analyses"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_title = Column(String, nullable=True)
    jd_text = Column(Text, nullable=False)
    cv_text = Column(Text, nullable=False)
    total_score = Column(Float, default=0)
    skills_score = Column(Float, default=0)
    experience_score = Column(Float, default=0)
    education_score = Column(Float, default=0)
    extras_score = Column(Float, default=0)
    matched_skills = Column(JSON, nullable=True)
    missing_skills = Column(JSON, nullable=True)
    reasoning = Column(Text, nullable=True)
    suggestions = Column(JSON, nullable=True)
    fit_verdict = Column(String, nullable=True)
    detailed_advice = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
