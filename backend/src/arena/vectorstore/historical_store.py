"""Historical store for persistent verdict evidence and semantic retrieval"""

import json
from typing import Any, Dict, List, Optional

from arena.config.settings import settings
from arena.models.decision_evidence import DecisionEvidence
from arena.vectorstore.chroma_client import get_evidence_collection


class HistoricalStore:
    """
    Manages persistent storage and retrieval of decision evidence via semantic search.

    Used for Phase 2: Historical Intelligence - agents can retrieve similar past verdicts
    before attacking/analyzing ideas to strengthen their reasoning with pattern data.
    """

    def __init__(self):
        """Initialize historical store (wraps Chroma DB)"""
        self.enabled = settings.enable_historical_context
        self.collection_name = "decision_evidence"

    async def persist_decision_evidence(self, evidence: DecisionEvidence) -> str:
        """
        Persist verdict evidence to historical store for future retrieval.

        Args:
            evidence: DecisionEvidence model with verdict, scores, recommendations

        Returns:
            Document ID in Chroma

        Note:
            If ENABLE_HISTORICAL_CONTEXT is False, returns empty string (no-op).
        """
        if not self.enabled:
            return ""

        try:
            collection = self._get_collection()

            # Metadata for filtering/context (Chroma stores this separately from embeddings)
            metadata = {
                "debate_id": evidence.debate_id,
                "verdict_decision": evidence.verdict_decision,
                "overall_score": evidence.overall_score,
                "domain": evidence.domain,
                "confidence": evidence.confidence,
                "timestamp": evidence.timestamp.isoformat(),
            }

            # Document text: JSON serialization for context
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

            # Add to collection with embedding
            collection.add(
                ids=[evidence.debate_id],
                embeddings=[evidence.idea_embedding],
                documents=[document_text],
                metadatas=[metadata],
            )

            return evidence.debate_id
        except Exception as e:
            print(f"Error persisting decision evidence: {e}")
            return ""

    async def retrieve_similar_ideas(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        domain_filter: Optional[str] = None,
        verdict_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve semantically similar past ideas via intelligent re-ranking.

        Broad Retrieval + Re-ranking + Diversity
        - Retrieves broadly (all domains) from vector DB
        - Scores each by: semantic similarity + domain match bonus + confidence
        - Selects diverse top-K to avoid homogeneous results
        - Agents see patterns across domains + same-domain insights

        Args:
            query_embedding: Embedding vector of current idea
            n_results: Final number of results to return (default: 5)
            domain_filter: Optional primary domain (used for bonus scoring, not hard filtering)
            verdict_filter: Optional verdict decision to filter by (e.g., "Pivot", "Kill")

        Returns:
            List of diverse, re-ranked past verdicts with metadata and recommendations
        """
        if not self.enabled:
            return []

        try:
            collection = self._get_collection()

            # Step 1: Retrieve broadly (2x-3x more results than we need)
            initial_fetch = n_results * 3  # Get 15 if we want 5

            where = None
            if verdict_filter:
                where = {"verdict_decision": verdict_filter}

            # Broad semantic search (NO hard domain filter - fetch all domains)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=initial_fetch,
                where=where,
            )

            # Step 2: Parse and score results
            candidates = []
            if results["ids"] and len(results["ids"]) > 0:
                for i in range(len(results["ids"][0])):
                    try:
                        doc_text = results["documents"][0][i]
                        parsed = json.loads(doc_text)
                        metadata = results["metadatas"][0][i]
                        distance = results["distances"][0][i] if "distances" in results else 0

                        # Calculate composite score
                        # Semantic similarity: lower distance = higher similarity (0-1 scale)
                        semantic_score = 1.0 - min(distance / 2.0, 1.0)  # Normalize distance

                        # Domain match bonus: +0.1 if same domain
                        domain_bonus = (
                            0.1
                            if domain_filter and metadata.get("domain") == domain_filter
                            else 0.0
                        )

                        # Confidence bonus: scale by stored confidence (0-1)
                        confidence_bonus = (metadata.get("confidence", 0.5) - 0.5) * 0.1

                        composite_score = semantic_score + domain_bonus + confidence_bonus

                        candidates.append(
                            {
                                "idea_summary": parsed.get("idea_summary"),
                                "verdict_decision": parsed.get("verdict_decision"),
                                "overall_score": parsed.get("overall_score"),
                                "kill_shots": parsed.get("kill_shots", [])[:3],
                                "assumptions": parsed.get("assumptions", []),
                                "recommendations": parsed.get("recommendations", []),
                                "domain": metadata.get("domain"),
                                "confidence": metadata.get("confidence"),
                                "distance": distance,
                                "semantic_score": semantic_score,
                                "domain_bonus": domain_bonus,
                                "composite_score": composite_score,
                            }
                        )
                    except Exception:
                        continue

            # Step 3: Diversity re-ranking
            # Select top-K with diversity: don't pick 5 "Kill" verdicts, mix with "Pivot", "Proceed"
            final_results = self._diversity_rerank(candidates, n_results, domain_filter)

            # Clean up scoring fields before returning
            for result in final_results:
                result.pop("semantic_score", None)
                result.pop("domain_bonus", None)
                result.pop("composite_score", None)

            return final_results

        except Exception as e:
            print(f"Error retrieving similar ideas: {e}")
            return []

    def _diversity_rerank(
        self,
        candidates: List[Dict[str, Any]],
        n_results: int,
        primary_domain: Optional[str],
    ) -> List[Dict[str, Any]]:
        """
        Re-rank candidates for diversity: prioritize high-scoring results
        but ensure mix of verdict types and domains.

        Strategy:
        - Sort by composite_score
        - Select top scorer
        - For each slot: pick highest-scoring result that differs in
          verdict_decision or domain
        - Fallback to score order if diversity exhausted

        Args:
            candidates: List of candidate ideas with scores
            n_results: Number of final results
            primary_domain: Primary domain for diversity weighting

        Returns:
            Diverse top-K results sorted by composite score
        """
        if not candidates:
            return []

        # Sort by composite score (descending)
        candidates_sorted = sorted(candidates, key=lambda x: x["composite_score"], reverse=True)

        final_results: list[dict[str, Any]] = []
        used_verdicts = set()
        used_domains = set()

        for candidate in candidates_sorted:
            if len(final_results) >= n_results:
                break

            verdict = candidate["verdict_decision"]
            domain = candidate["domain"]

            # Diversity rule:
            # - Always pick top scorer
            # - Then diversify verdict types and domains
            if len(final_results) == 0:
                # Always include top scorer
                final_results.append(candidate)
                used_verdicts.add(verdict)
                used_domains.add(domain)
            else:
                # Prefer candidates with new verdict types or domains
                verdict_is_new = verdict not in used_verdicts
                domain_is_new = domain not in used_domains

                # If we have room and this adds diversity, include it
                if verdict_is_new or domain_is_new:
                    final_results.append(candidate)
                    used_verdicts.add(verdict)
                    used_domains.add(domain)
                # Otherwise, only include if we haven't hit n_results and it scores well
                elif len(final_results) < n_results:
                    final_results.append(candidate)
                    used_verdicts.add(verdict)
                    used_domains.add(domain)

        return final_results

    def _get_collection(self):
        """Get or create Chroma collection for decision evidence"""
        client = get_evidence_collection.__self__.__class__.__dict__.get(
            "get_chroma_client", lambda: None
        )()
        # Use evidence collection but with decision_evidence metadata
        try:
            collection = client.get_collection(name=self.collection_name)
        except Exception:
            collection = client.create_collection(
                name=self.collection_name,
                metadata={"description": "Stores decision evidence from debate verdicts"},
            )
        return collection


# Singleton instance
_historical_store: Optional[HistoricalStore] = None


def get_historical_store() -> HistoricalStore:
    """Get or create singleton historical store instance"""
    global _historical_store
    if _historical_store is None:
        _historical_store = HistoricalStore()
    return _historical_store
