"""Application settings"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Google Gemini
    google_api_key: str

    # ChromaDB
    chromadb_path: str = "./chroma_db"

    embedding_model: str = "models/embedding-001"

    # LLM model
    llm_model: str = "gemini-2.5-flash"

    # Throttling / Backoff
    llm_max_concurrency_per_debate: int = 1
    llm_backoff_max_attempts: int = 3
    llm_backoff_base_delay: float = 0.5
    llm_backoff_max_delay: float = 4.0

    # Phase 2: Historical Intelligence (semantic search across past verdicts)
    enable_historical_context: bool = False

    # Application
    environment: str = "development"
    log_level: str = "INFO"

    # Firebase / Firestore
    firebase_service_account_path: str = "service-account-dev.json"
    firebase_project_id: str | None = None

    # Backend Auth (JWT)
    jwt_secret: str | None = None
    jwt_exp_minutes: int = 60

    # CORS
    cors_allowed_origins: str = (
        "*"  # comma-separated list, e.g., "http://localhost:3000,https://app.example.com"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
