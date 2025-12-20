"""Gemini LLM client setup"""

from arena.config.settings import settings
from langchain_google_genai import ChatGoogleGenerativeAI


def get_gemini_llm(
    model: str = "gemini-2.5-flash-lite",
    temperature: float = 0.7,
) -> ChatGoogleGenerativeAI:
    """
    Creates and returns a configured Gemini LLM instance.

    Args:
        model: Gemini model name (default: "gemini-2.5-flash-lite")
        temperature: Temperature for generation (default: 0.7)

    Returns:
        Configured ChatGoogleGenerativeAI instance
    """
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.google_api_key,
        temperature=temperature,
    )
