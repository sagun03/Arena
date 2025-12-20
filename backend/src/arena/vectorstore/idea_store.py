"""Idea storage and retrieval (for future analytics, NOT used during debate)"""

import uuid
from typing import Any, Dict, List

from arena.llm.prd_extractor import prepare_idea_for_embedding
from arena.models.idea import Idea
from arena.vectorstore.chroma_client import get_ideas_collection
from arena.vectorstore.embeddings import embed_texts


async def store_idea(idea: Idea, debate_id: str) -> List[str]:
    """
    Store idea as embeddings in ChromaDB.

    Stores:
    1. original_prd_text (chunked if >500 tokens)
    2. Extracted structure (combined text)

    Args:
        idea: Idea object to store
        debate_id: Debate identifier

    Returns:
        List of document IDs created
    """
    collection = get_ideas_collection()
    doc_ids = []

    # Prepare metadata
    base_metadata = {
        "debate_id": debate_id,
        "timestamp": str(uuid.uuid1().time),
        "extraction_metadata": str(idea.extracted_structure.metadata),
    }

    # 1. Store original PRD text (chunked if needed)
    prd_text = idea.original_prd_text
    if len(prd_text) > 500:  # Rough token estimate (1 token ≈ 4 chars)
        # Simple chunking - split by sentences/paragraphs
        chunks = _chunk_text(prd_text, chunk_size=500)
        for i, chunk in enumerate(chunks):
            chunk_embedding = await embed_texts([chunk])
            doc_id = str(uuid.uuid4())
            collection.add(
                ids=[doc_id],
                embeddings=[chunk_embedding[0]],
                documents=[chunk],
                metadatas=[
                    {
                        **base_metadata,
                        "type": "original_prd",
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                    }
                ],
            )
            doc_ids.append(doc_id)
    else:
        # Store as single embedding
        prd_embedding = await embed_texts([prd_text])
        doc_id = str(uuid.uuid4())
        collection.add(
            ids=[doc_id],
            embeddings=[prd_embedding[0]],
            documents=[prd_text],
            metadatas=[
                {**base_metadata, "type": "original_prd", "chunk_index": 0, "total_chunks": 1}
            ],
        )
        doc_ids.append(doc_id)

    # 2. Store extracted structure (combined text)
    structure_text = prepare_idea_for_embedding(idea)
    structure_embedding = await embed_texts([structure_text])
    doc_id = str(uuid.uuid4())
    collection.add(
        ids=[doc_id],
        embeddings=[structure_embedding[0]],
        documents=[structure_text],
        metadatas=[
            {
                **base_metadata,
                "type": "structured",
                "sections_count": len(idea.extracted_structure.sections),
                "key_facts_count": len(idea.extracted_structure.key_facts),
                "lists_count": len(idea.extracted_structure.lists),
            }
        ],
    )
    doc_ids.append(doc_id)

    return doc_ids


async def search_similar_ideas(query: str, n: int = 5) -> List[Dict[str, Any]]:
    """
    Search for similar past ideas.

    NOTE: This is NOT used during debate - agents only debate current PRD.
    This is for future analytics/insights features.

    Args:
        query: Search query text
        n: Number of results to return

    Returns:
        List of similar ideas with metadata
    """
    collection = get_ideas_collection()

    # Generate query embedding
    query_embeddings = await embed_texts([query])
    query_embedding = query_embeddings[0]

    # Search
    results = collection.query(query_embeddings=[query_embedding], n_results=n)

    # Format results
    ideas_list = []
    if results["ids"] and len(results["ids"]) > 0:
        for i in range(len(results["ids"][0])):
            ideas_list.append(
                {
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if "distances" in results else None,
                }
            )

    return ideas_list


def _chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """
    Simple text chunking by sentences/paragraphs.

    Args:
        text: Text to chunk
        chunk_size: Approximate chunk size in characters

    Returns:
        List of text chunks
    """
    # Split by double newlines (paragraphs) first
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) <= chunk_size:
            current_chunk += paragraph + "\n\n"
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = paragraph + "\n\n"

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks
