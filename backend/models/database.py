from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    from models.schemas import JobPosting, Candidate, ScreeningResult, BiasReport, Ranking
    from models.user import User
    from models.student_analysis import StudentAnalysis
    from models.chat_message import ChatMessage
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in settings.DATABASE_URL:
            result = await conn.exec_driver_sql("PRAGMA table_info(users)")
            columns = {row[1] for row in result.fetchall()}
            if "company_name" not in columns:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN company_name VARCHAR")
            if "is_verified" not in columns:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1")
                await conn.exec_driver_sql("UPDATE users SET is_verified = 1")
            if "verification_code" not in columns:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN verification_code VARCHAR")
            if "verification_code_expires_at" not in columns:
                await conn.exec_driver_sql("ALTER TABLE users ADD COLUMN verification_code_expires_at DATETIME")
