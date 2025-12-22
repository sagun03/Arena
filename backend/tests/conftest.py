"""Pytest configuration and fixtures"""

from typing import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from arena.config.settings import Settings
from arena.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def test_settings() -> Settings:
    """Create test settings with mock values"""
    return Settings(
        google_api_key="test-google-api-key",
        langsmith_api_key=None,  # Disable LangSmith for tests
        langsmith_project="test-project",
        redis_host="localhost",
        redis_port=6379,
        redis_db=0,
        redis_password=None,
        chromadb_path="./test_chroma_db",
        environment="test",
        log_level="DEBUG",
    )


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Create test client for FastAPI app"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_llm():
    """Mock LLM for testing"""
    mock = AsyncMock()
    mock.ainvoke = AsyncMock(
        return_value=MagicMock(content='{"response": "Test response", "claims": []}')
    )
    return mock


@pytest.fixture
def sample_idea():
    """Sample idea for testing"""
    return {
        "original_prd_text": "A platform that connects freelance designers with clients.",
        "extracted_structure": {
            "sections": [
                {
                    "title": "Problem Statement",
                    "content": "Small businesses need affordable design services",
                    "category": "core",
                    "key_points": ["Affordable", "Quality"],
                }
            ],
            "key_facts": {
                "Target Customer": "Small businesses and startups",
                "Pricing": "$50-200 per project",
            },
            "lists": {
                "Competitors": ["Fiverr", "Upwork", "99designs"],
            },
            "metadata": {
                "total_sections": 1,
                "has_technical": False,
            },
        },
    }


@pytest.fixture
def sample_debate_state(sample_idea):
    """Sample debate state for testing"""
    return {
        "idea": sample_idea,
        "debate_id": "test-debate-123",
        "current_round": 0,
        "round_status": "pending",
        "evidence_tags": [],
        "transcript": [],
        "started_at": "2024-01-01T00:00:00",
    }


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Mock environment variables for tests"""
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google-api-key")
    monkeypatch.setenv("LANGSMITH_API_KEY", "")
    monkeypatch.setenv("REDIS_HOST", "localhost")
    monkeypatch.setenv("REDIS_PORT", "6379")
