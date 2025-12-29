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

    # Evidence storage toggle
    store_evidence: bool = True

    # Application
    environment: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
