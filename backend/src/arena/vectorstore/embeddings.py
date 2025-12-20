"""Embedding functions for ARENA"""

from typing import List

from arena.config.settings import settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Global embedding function instance
_embedding_function: GoogleGenerativeAIEmbeddings | None = None


def get_embedding_function() -> GoogleGenerativeAIEmbeddings:
    """
    Get embedding function using Gemini embeddings.

    Returns:
        GoogleGenerativeAIEmbeddings instance
    """
    global _embedding_function
    if _embedding_function is None:
        _embedding_function = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.google_api_key,
        )
    return _embedding_function


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts (async).

    Args:
        texts: List of text strings to embed

    Returns:
        List of embedding vectors
    """
    embedding_function = get_embedding_function()
    return await embedding_function.aembed_documents(texts)


def embed_texts_sync(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts (sync).

    Args:
        texts: List of text strings to embed

    Returns:
        List of embedding vectors
    """
    embedding_function = get_embedding_function()
    return embedding_function.embed_documents(texts)
