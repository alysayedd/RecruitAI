"""Minimal test to reproduce the login 500 error."""
import asyncio
from models.database import AsyncSessionLocal, init_db
from models.user import User
from sqlalchemy import select
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from jose import jwt
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def test_login():
    await init_db()
    async with AsyncSessionLocal() as db:
        email = "demo@recruitai.dev"
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"User {email} not found")
            return
        print(f"User: {user.id} role={user.role}")

        ok = pwd_context.verify("demo123", user.hashed_password)
        print(f"Password verify: {ok}")
        if not ok:
            print("Password mismatch")
            return

        data = {"sub": user.id}
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        data.update({"exp": expire})
        token = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        print(f"Token: {token[:30]}...")
        print("LOGIN OK")


asyncio.run(test_login())
