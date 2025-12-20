"""ChromaDB client setup"""

import chromadb
from arena.config.settings import settings
from chromadb import ClientAPI, Collection

# Global ChromaDB client
_chroma_client: ClientAPI | None = None


def get_chroma_client() -> ClientAPI:
    """
    Get or create ChromaDB persistent client.

    Returns:
        ChromaDB client instance
    """
    global _chroma_client

    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.chromadb_path)

    return _chroma_client


def get_evidence_collection() -> Collection:
    """
    Get or create evidence collection for storing agent claims/evidence.

    Returns:
        ChromaDB collection for evidence
    """
    client = get_chroma_client()
    collection_name = "evidence_collection"

    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        # Collection doesn't exist, create it
        collection = client.create_collection(
            name=collection_name,
            metadata={"description": "Stores agent claims and evidence with embeddings"},
        )

    return collection


def get_ideas_collection() -> Collection:
    """
    Get or create ideas collection for storing idea embeddings.

    Returns:
        ChromaDB collection for ideas
    """
    client = get_chroma_client()
    collection_name = "ideas_collection"

    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        # Collection doesn't exist, create it
        collection = client.create_collection(
            name=collection_name,
            metadata={"description": "Stores idea embeddings for future analytics"},
        )

    return collection
