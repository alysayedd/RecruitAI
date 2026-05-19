from sqlalchemy import Column, String, DateTime, Boolean
from datetime import datetime, timezone
from models.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="hr")
    company_name = Column(String, nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
