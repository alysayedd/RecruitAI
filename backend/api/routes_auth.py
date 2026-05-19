import uuid
import secrets
import asyncio
import smtplib
import logging
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.database import get_db
from models.user import User
from models.schemas import JobPosting, Candidate, ScreeningResult, BiasReport, Ranking
from models.student_analysis import StudentAnalysis
from models.chat_message import ChatMessage
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "hr"
    company_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    company_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    company_name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendCodeRequest(BaseModel):
    email: EmailStr


class SignupResponse(BaseModel):
    message: str
    email: str


VERIFICATION_CODE_EXPIRY_MINUTES = 10


def _generate_verification_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _send_verification_email(recipient: str, code: str) -> None:
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    if not settings.SMTP_HOST or not from_email:
        logger.warning("SMTP not configured — verification code for %s: %s", recipient, code)
        return

    message = EmailMessage()
    sender_name = settings.SMTP_FROM_NAME or "RecruitAI"
    message["From"] = f"{sender_name} <{from_email}>"
    message["To"] = recipient
    message["Subject"] = f"Your RecruitAI verification code: {code}"
    message.set_content(
        f"Welcome to RecruitAI!\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code expires in {VERIFICATION_CODE_EXPIRY_MINUTES} minutes.\n\n"
        f"If you didn't create an account, you can ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        company_name=user.company_name,
    )


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


@router.post("/signup", response_model=SignupResponse)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    existing_user = existing.scalar_one_or_none()

    if existing_user and existing_user.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    if len(body.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 6 characters")
    if body.role not in ("student", "hr"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Role must be 'student' or 'hr'")

    code = _generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES)

    if existing_user and not existing_user.is_verified:
        existing_user.name = body.name
        existing_user.hashed_password = pwd_context.hash(body.password)
        existing_user.role = body.role
        existing_user.company_name = body.company_name.strip() if body.company_name else None
        existing_user.verification_code = code
        existing_user.verification_code_expires_at = expires_at
    else:
        user = User(
            id=str(uuid.uuid4()),
            name=body.name,
            email=body.email,
            hashed_password=pwd_context.hash(body.password),
            role=body.role,
            company_name=body.company_name.strip() if body.company_name else None,
            is_verified=False,
            verification_code=code,
            verification_code_expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)

    await db.commit()

    try:
        await asyncio.to_thread(_send_verification_email, body.email, code)
    except Exception as exc:
        logger.error("Failed to send verification email: %s", exc)

    return SignupResponse(message="Verification code sent", email=body.email)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified. Please check your inbox for the verification code.")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=to_user_response(user),
    )


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(body: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")

    if user.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already verified")

    if not user.verification_code or user.verification_code != body.code.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification code")

    if user.verification_code_expires_at and datetime.now(timezone.utc) > user.verification_code_expires_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code has expired. Please request a new one.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=to_user_response(user),
    )


@router.post("/resend-code", response_model=SignupResponse)
async def resend_code(body: ResendCodeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")

    if user.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already verified")

    code = _generate_verification_code()
    user.verification_code = code
    user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES)
    await db.commit()

    try:
        await asyncio.to_thread(_send_verification_email, body.email, code)
    except Exception as exc:
        logger.error("Failed to send verification email: %s", exc)

    return SignupResponse(message="Verification code sent", email=body.email)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return to_user_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name cannot be empty")
        user.name = name

    if body.company_name is not None:
        company = body.company_name.strip()
        user.company_name = company or None

    await db.commit()
    await db.refresh(user)
    return to_user_response(user)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not pwd_context.verify(body.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 6 characters")

    user.hashed_password = pwd_context.hash(body.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.delete("/me")
async def delete_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    jobs_result = await db.execute(select(JobPosting.id).where(JobPosting.user_id == user.id))
    job_ids = [row[0] for row in jobs_result.all()]

    if job_ids:
        candidates_result = await db.execute(select(Candidate.id).where(Candidate.job_id.in_(job_ids)))
        candidate_ids = [row[0] for row in candidates_result.all()]

        await db.execute(delete(Ranking).where(Ranking.job_id.in_(job_ids)))
        await db.execute(delete(ScreeningResult).where(ScreeningResult.job_id.in_(job_ids)))
        await db.execute(delete(BiasReport).where(BiasReport.job_id.in_(job_ids)))

        if candidate_ids:
            await db.execute(delete(Candidate).where(Candidate.id.in_(candidate_ids)))

        await db.execute(delete(JobPosting).where(JobPosting.id.in_(job_ids)))

    await db.execute(delete(StudentAnalysis).where(StudentAnalysis.user_id == user.id))
    await db.execute(delete(ChatMessage).where(ChatMessage.user_id == user.id))
    await db.delete(user)
    await db.commit()

    return {"message": "Account deleted successfully"}
