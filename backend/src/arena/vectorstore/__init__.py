"""Vector store integration for ARENA"""

from arena.vectorstore.chroma_client import (
    get_chroma_client,
    get_evidence_collection,
    get_ideas_collection,
)
from arena.vectorstore.embeddings import get_embedding_function
from arena.vectorstore.evidence_store import search_similar_evidence, store_evidence
from arena.vectorstore.idea_store import search_similar_ideas, store_idea

__all__ = [
    "get_chroma_client",
    "get_evidence_collection",
    "get_ideas_collection",
    "get_embedding_function",
    "store_evidence",
    "search_similar_evidence",
    "store_idea",
    "search_similar_ideas",
]
