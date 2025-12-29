"""Embedding functions for ARENA"""

from typing import Dict, List

from arena.config.settings import settings
from arena.llm.rate_control import embeddings_call_with_limits
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
            model=settings.embedding_model,
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

    # Deduplicate and use cache
    unique: Dict[str, int] = {}
    for i, t in enumerate(texts):
        if t not in unique:
            unique[t] = i

    results: List[List[float]] = [None] * len(texts)  # type: ignore
    to_compute: List[str] = []

    for t in texts:
        to_compute.append(t)

    if to_compute:
        computed = await embeddings_call_with_limits(
            lambda: embedding_function.aembed_documents(to_compute)
        )
        # Map back to original positions
        for i, vec in enumerate(computed):
            results[i] = vec  # type: ignore

    return results  # type: ignore


def embed_texts_sync(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts (sync).

    Args:
        texts: List of text strings to embed

    Returns:
        List of embedding vectors
    """
    embedding_function = get_embedding_function()
    # Sync path: no rate limiter
    vecs = embedding_function.embed_documents(texts)
    return vecs
