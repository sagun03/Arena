"""Evidence storage and retrieval"""

import uuid
from typing import Any, Dict, List

from arena.vectorstore.chroma_client import get_evidence_collection
from arena.vectorstore.embeddings import embed_texts


async def store_evidence(text: str, metadata: Dict[str, Any]) -> str:
    """
    Store evidence/claim with embedding in ChromaDB.

    Args:
        text: Evidence/claim text
        metadata: Metadata dictionary (agent, round, debate_id, etc.)

    Returns:
        Document ID
    """
    collection = get_evidence_collection()

    # Generate embedding
    embeddings = await embed_texts([text])
    embedding = embeddings[0]

    # Generate unique ID
    doc_id = str(uuid.uuid4())

    # Store in ChromaDB
    collection.add(ids=[doc_id], embeddings=[embedding], documents=[text], metadatas=[metadata])

    return doc_id


async def search_similar_evidence(
    query: str, n: int = 5, debate_id: str | None = None
) -> List[Dict[str, Any]]:
    """
    Search for similar evidence/claims.

    Args:
        query: Search query text
        n: Number of results to return
        debate_id: Optional debate ID to filter results (only search within same debate)

    Returns:
        List of similar evidence with metadata
    """
    collection = get_evidence_collection()

    # Generate query embedding
    query_embeddings = await embed_texts([query])
    query_embedding = query_embeddings[0]

    # Build where clause if debate_id provided
    where = None
    if debate_id:
        where = {"debate_id": debate_id}

    # Search
    results = collection.query(query_embeddings=[query_embedding], n_results=n, where=where)

    # Format results
    evidence_list = []
    if results["ids"] and len(results["ids"]) > 0:
        for i in range(len(results["ids"][0])):
            evidence_list.append(
                {
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if "distances" in results else None,
                }
            )

    return evidence_list
