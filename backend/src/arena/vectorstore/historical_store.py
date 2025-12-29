"""Historical store for persistent verdict evidence and semantic retrieval."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from arena.config.settings import settings
from arena.ml.ranking import (
    Candidate,
    LogisticRanker,
    build_feature_vector,
    mmr_select,
    to_public_result,
)
from arena.models.decision_evidence import DecisionEvidence
from arena.monitoring.metrics import logger
from arena.vectorstore.chroma_client import get_chroma_client


class HistoricalStore:
    """Manages persistence and retrieval of decision evidence for Phase 2."""

    def __init__(self):
        self.enabled = settings.enable_historical_context
        self.collection_name = "decision_evidence"
        self.ranker = LogisticRanker()

    async def persist_decision_evidence(self, evidence: DecisionEvidence) -> str:
        """Persist evidence asynchronously with bounded retries (never blocks debate)."""
        if not self.enabled:
            return ""

        asyncio.create_task(self._persist_with_retries(evidence))
        return evidence.debate_id

    async def _persist_with_retries(
        self, evidence: DecisionEvidence, max_attempts: int = 3, base_delay: float = 0.5
    ) -> None:
        delay = base_delay
        for attempt in range(1, max_attempts + 1):
            try:
                collection = self._get_collection()
                metadata = {
                    "debate_id": evidence.debate_id,
                    "source_debate_id": evidence.source_debate_id or evidence.debate_id,
                    "verdict_decision": evidence.verdict_decision,
                    "overall_score": evidence.overall_score,
                    "domain": evidence.domain,
                    "confidence": evidence.confidence,
                    "timestamp": evidence.timestamp.isoformat(),
                }
                document_text = json.dumps(
                    {
                        "idea_summary": evidence.idea_summary,
                        "verdict_decision": evidence.verdict_decision,
                        "overall_score": evidence.overall_score,
                        "kill_shots": evidence.kill_shots,
                        "assumptions": evidence.assumptions,
                        "recommendations": evidence.recommendations,
                        "domain": evidence.domain,
                    }
                )

                collection.add(
                    ids=[evidence.debate_id],
                    embeddings=[evidence.idea_embedding],
                    documents=[document_text],
                    metadatas=[metadata],
                )
                logger.info(
                    "historical_persist success debate_id=%s attempt=%d",
                    evidence.debate_id,
                    attempt,
                )
                return
            except Exception as e:
                logger.warning(
                    "historical_persist failure debate_id=%s attempt=%d error=%s",
                    evidence.debate_id,
                    attempt,
                    e,
                )
                if attempt == max_attempts:
                    return
                await asyncio.sleep(delay)
                delay *= 2

    async def retrieve_similar_ideas(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        domain_filter: Optional[str] = None,
        verdict_filter: Optional[str] = None,
        idea_text: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve similar ideas, rank with logistic scorer, diversify with MMR."""
        if not self.enabled:
            return []

        try:
            collection = self._get_collection()
            initial_fetch = max(n_results * 3, n_results + 2)

            where = None
            if verdict_filter:
                where = {"verdict_decision": verdict_filter}

            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=initial_fetch,
                where=where,
                include=["metadatas", "documents", "distances", "embeddings", "ids"],
            )

            candidates: List[Candidate] = []
            ids = results.get("ids", [[]])[0]
            documents = results.get("documents", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0] if results.get("distances") else []
            embeddings = results.get("embeddings", [[]])[0] if results.get("embeddings") else []

            for idx in range(len(ids)):
                try:
                    doc_text = documents[idx]
                    parsed = json.loads(doc_text) if isinstance(doc_text, str) else {}
                    metadata = metadatas[idx] if idx < len(metadatas) else {}
                    distance = distances[idx] if idx < len(distances) else 0.0
                    candidate_embedding = embeddings[idx] if idx < len(embeddings) else None

                    features = build_feature_vector(
                        candidate={
                            "distance": distance,
                            "verdict_decision": parsed.get("verdict_decision"),
                            "kill_shots": parsed.get("kill_shots", []),
                        },
                        metadata=metadata,
                        query_embedding=query_embedding,
                        candidate_embedding=candidate_embedding,
                        idea_domain=domain_filter,
                        idea_text=idea_text,
                    )
                    score = self.ranker.score(features)
                    candidates.append(
                        Candidate(
                            id=str(ids[idx]),
                            document={
                                "idea_summary": parsed.get("idea_summary"),
                                "verdict_decision": parsed.get("verdict_decision"),
                                "overall_score": parsed.get("overall_score"),
                                "kill_shots": parsed.get("kill_shots", []),
                                "assumptions": parsed.get("assumptions", []),
                                "recommendations": parsed.get("recommendations", []),
                            },
                            metadata=metadata,
                            embedding=candidate_embedding,
                            distance=distance,
                            features=features,
                            ranker_score=score,
                        )
                    )
                except Exception as parse_error:
                    logger.warning("historical_parse_failure error=%s", parse_error)
                    continue

            selected, diversity = mmr_select(candidates, query_embedding, k=n_results)
            logger.info(
                "historical_retrieval selected=%d diversity_domains=%d diversity_verdicts=%d",
                len(selected),
                diversity.get("num_unique_domains", 0),
                diversity.get("num_unique_verdicts", 0),
            )

            return [to_public_result(c) for c in selected]
        except Exception as e:
            logger.warning("Error retrieving similar ideas: %s", e)
            return []

    def _get_collection(self):
        """Get or create Chroma collection for decision evidence."""
        client = get_chroma_client()
        try:
            return client.get_collection(name=self.collection_name)
        except Exception:
            return client.create_collection(
                name=self.collection_name,
                metadata={"description": "Stores decision evidence from debate verdicts"},
            )


# Singleton instance
_historical_store: Optional[HistoricalStore] = None


def get_historical_store() -> HistoricalStore:
    """Get or create singleton historical store instance."""
    global _historical_store
    if _historical_store is None:
        _historical_store = HistoricalStore()
    return _historical_store
