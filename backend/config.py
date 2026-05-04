from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./recruitment_ai.db"
    UPLOAD_DIR: str = "./uploads"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    BIAS_CORRECTION_BONUS: float = 5.0
    SHORTLIST_THRESHOLD: float = 0.3

    class Config:
        env_file = ".env"

settings = Settings()
