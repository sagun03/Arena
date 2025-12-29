"""Gemini LLM client setup"""

from arena.config.settings import settings
from langchain_google_genai import ChatGoogleGenerativeAI


def get_gemini_llm(
    model: str | None = None,
    temperature: float = 0.7,
) -> ChatGoogleGenerativeAI:
    """
    Creates and returns a configured Gemini LLM instance.

    Args:
        model: Gemini model name (uses settings.llm_model if not provided)
        temperature: Temperature for generation (default: 0.7)

    Returns:
        Configured ChatGoogleGenerativeAI instance
    """
    model_name = model or settings.llm_model
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=settings.google_api_key,
        temperature=temperature,
    )
