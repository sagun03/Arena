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

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
