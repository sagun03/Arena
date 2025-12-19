"""Application settings"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Google Gemini
    google_api_key: str

    # LangSmith
    langsmith_api_key: str | None = None
    langsmith_project: str = "arena-mvp"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None

    # ChromaDB
    chromadb_path: str = "./chroma_db"

    # Application
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
