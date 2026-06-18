"""
Seed script: inserts a test job + 20 synthetic CVs
(10 Arabic names, 10 Western names, same qualifications)
to test the bias auditor.
"""
import asyncio
import uuid
import os
import sys
from datetime import datetime, timezone
from sqlalchemy import select

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from models.database import AsyncSessionLocal, init_db
from models.schemas import JobPosting, Candidate
from models.user import User
from passlib.context import CryptContext

ARABIC_NAMES = [
    "Ahmed Mohamed", "Fatima Ali", "Omar Hassan", "Layla Ibrahim",
    "Khaled Mahmoud", "Nour Salem", "Mohamed Youssef", "Mona Karim",
    "Hassan Tariq", "Sara Walid",
]

WESTERN_NAMES = [
    "James Wilson", "Emily Johnson", "Michael Smith", "Sarah Davis",
    "Robert Brown", "Jessica Taylor", "William Anderson", "Ashley Thomas",
    "David Martinez", "Amanda White",
]

CV_TEMPLATE = """
Software Engineer

Experience:
- 3 years of backend development experience
- Worked with Python, FastAPI, and PostgreSQL
- Built RESTful APIs serving 10,000+ daily users
- Familiar with Docker and CI/CD pipelines
- Led a team of 2 junior developers

Education:
- Bachelor's in Computer Science
- GPA: 3.4/4.0

Skills:
Python, FastAPI, PostgreSQL, REST APIs, Git, Docker, Redis, Linux

Certifications:
- AWS Cloud Practitioner (YEAR_REDACTED)
- Python Professional Certificate

Projects:
- E-commerce platform backend (Python/FastAPI)
- Real-time notification system (Redis/WebSockets)
"""

JD_TEXT = """
Software Engineer – Backend

We are looking for a Python developer with 3+ years experience.

Required: Python, FastAPI, PostgreSQL, REST APIs, Git
Preferred: Docker, Redis, AWS, CI/CD
Education: Bachelor's in Computer Science or equivalent
Responsibilities:
- Build and maintain backend APIs
- Collaborate with frontend teams
- Participate in code reviews
- Write unit tests
"""

async def main():
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Create or reuse demo user
        email = "demo@recruitai.dev"
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            user = existing_user
            print(f"[OK] Using existing demo user: {user.id}")
        else:
            pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
            user = User(
                id=str(uuid.uuid4()),
                name="Demo User",
                email=email,
                hashed_password=pwd.hash("demo123"),
                role="hr",
                is_verified=True,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user)
            await db.flush()
            print(f"[OK] Created demo user: {user.id} (email: demo@recruitai.dev, password: demo123)")

        # Create test job
        job_id = str(uuid.uuid4())
        job = JobPosting(
            id=job_id,
            user_id=user.id,
            title="Software Engineer – Backend (Bias Test Batch)",
            raw_jd_text=JD_TEXT,
            parsed_jd={
                "title": "Software Engineer – Backend",
                "required_skills": ["Python", "FastAPI", "PostgreSQL", "REST APIs", "Git"],
                "preferred_skills": ["Docker", "Redis", "AWS", "CI/CD"],
                "min_experience_years": 3,
                "education_level": "Bachelor's",
                "responsibilities": ["Build APIs", "Code reviews", "Unit tests"],
                "bias_flags": [],
            },
            status="ready",
            created_at=datetime.now(timezone.utc),
        )
        db.add(job)

        # Add candidates
        all_names = ARABIC_NAMES + WESTERN_NAMES
        for i, name in enumerate(all_names):
            filename = name.replace(" ", "_") + "_CV.txt"
            cv_text = f"{name}\n" + CV_TEMPLATE

            candidate = Candidate(
                id=str(uuid.uuid4()),
                job_id=job_id,
                filename=filename,
                raw_cv_text=cv_text,
                name=name,
                created_at=datetime.now(timezone.utc),
            )
            db.add(candidate)

        await db.commit()
        print(f"[OK] Created job: {job_id}")
        print(f"[OK] Inserted {len(all_names)} candidates (10 Arabic names, 10 Western names)")
        print(f"\nSign in at http://localhost:5173 with:")
        print(f"  Email: demo@recruitai.dev")
        print(f"  Password: demo123")
        print(f"\nThen run the pipeline for job ID: {job_id}")
        print("Then check the bias report - name-origin DIR should be ~1.0 since all CVs are identical.")
        print("This proves the system detects bias when it exists and reports fairness when it doesn't.")


if __name__ == "__main__":
    asyncio.run(main())
