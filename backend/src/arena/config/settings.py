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

    # CORS (comma-separated list, e.g., "http://localhost:3000,https://app.example.com")
    cors_allowed_origins: str = "http://localhost:3000"

    # Stripe billing
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_success_url: str = "http://localhost:3000/billing/success"
    stripe_cancel_url: str = "http://localhost:3000/billing/cancel"
    stripe_price_starter_cad: str | None = None
    stripe_price_plus_cad: str | None = None
    stripe_price_pro_cad: str | None = None
    stripe_price_starter_inr: str | None = None
    stripe_price_plus_inr: str | None = None
    stripe_price_pro_inr: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
