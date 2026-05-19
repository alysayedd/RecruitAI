from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.database import init_db
from api.routes_job import router as job_router
from api.routes_candidates import router as candidates_router
from api.routes_results import router as results_router
from api.routes_email import router as email_router
from api.routes_auth import router as auth_router
from api.routes_student import router as student_router
from api.routes_dashboard import router as dashboard_router
from api.routes_chat import router as chat_router
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables on startup
    await init_db()
    os.makedirs("./uploads", exist_ok=True)
    yield


app = FastAPI(
    title="AI Recruitment Screening & Bias Analyzer",
    description="Multi-agent recruitment system with bias detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(student_router)
app.include_router(dashboard_router)
app.include_router(job_router)
app.include_router(candidates_router)
app.include_router(results_router)
app.include_router(email_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    return {"status": "running", "message": "AI Recruitment API is live"}


@app.get("/health")
async def health():
    return {"status": "ok"}
