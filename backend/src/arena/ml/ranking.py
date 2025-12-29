"""Feature engineering, ranking, and diversity selection for historical precedents.

Lightweight, sklearn-like API for Logistic Regression scoring plus MMR diversity.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Verdict severity encoding helps rank impactful precedents
VERDICT_SEVERITY = {
    "Proceed": 0.2,
    "NeedsMoreData": 0.4,
    "Pivot": 0.6,
    "Kill": 1.0,
}


@dataclass
class Candidate:
    """Candidate precedent with engineered features and scores."""

    id: str
    document: Dict[str, Any]
    metadata: Dict[str, Any]
    embedding: Optional[List[float]]
    distance: float
    features: Dict[str, float]
    ranker_score: float


class LogisticRanker:
    """Minimal logistic regression style scorer (weights + bias, pure Python)."""

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        bias: float = 0.0,
    ) -> None:
        # Tunable default weights; adjust offline as data grows
        self.weights = weights or {
            "semantic_similarity": 1.2,
            "domain_match": 0.6,
            "verdict_severity": 0.4,
            "confidence_weight": 0.5,
            "kill_shot_overlap": 0.3,
            "recency": 0.2,
        }
        self.bias = bias

    def score(self, features: Dict[str, float]) -> float:
        z = self.bias
        for name, weight in self.weights.items():
            z += weight * features.get(name, 0.0)
        return 1.0 / (1.0 + math.exp(-z))


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity safely."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def normalize_distance(distance: float) -> float:
    """Convert vector distance to similarity in [0,1]."""
    if distance < 0:
        return 0.0
    return 1.0 / (1.0 + distance)


def _token_set(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return set(tokens)


def kill_shot_overlap(kill_shots: List[Dict[str, Any]], idea_text: Optional[str]) -> float:
    """Rough textual overlap between precedent kill-shots and current idea text."""
    if not kill_shots or not idea_text:
        return 0.0
    idea_tokens = _token_set(idea_text)
    if not idea_tokens:
        return 0.0
    ks_tokens: set[str] = set()
    for ks in kill_shots:
        if isinstance(ks, dict):
            ks_tokens |= _token_set(str(ks.get("title", "")))
            ks_tokens |= _token_set(str(ks.get("description", "")))
    if not ks_tokens:
        return 0.0
    intersection = len(idea_tokens & ks_tokens)
    union = len(idea_tokens | ks_tokens)
    return (intersection / union) if union else 0.0


def recency_score(timestamp_iso: Optional[str]) -> float:
    """Score recency: newer items score closer to 1.0."""
    if not timestamp_iso:
        return 0.0
    try:
        ts = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        days = max((now - ts).days, 0)
        return 1.0 / (1.0 + days)
    except Exception:
        return 0.0


def build_feature_vector(
    candidate: Dict[str, Any],
    metadata: Dict[str, Any],
    query_embedding: List[float],
    candidate_embedding: Optional[List[float]],
    idea_domain: Optional[str],
    idea_text: Optional[str],
) -> Dict[str, float]:
    distance = candidate.get("distance", 0.0)
    verdict = metadata.get("verdict_decision") or candidate.get("verdict_decision", "")
    confidence = metadata.get("confidence", 0.5)
    timestamp = metadata.get("timestamp")
    kill_shots = candidate.get("kill_shots", [])

    similarity = normalize_distance(distance)
    if candidate_embedding is not None:
        similarity = max(similarity, cosine_similarity(query_embedding, candidate_embedding))

    domain_match = 1.0 if idea_domain and metadata.get("domain") == idea_domain else 0.0
    verdict_severity = VERDICT_SEVERITY.get(verdict, 0.5)
    overlap = kill_shot_overlap(kill_shots, idea_text)
    recency = recency_score(timestamp)

    return {
        "semantic_similarity": similarity,
        "domain_match": domain_match,
        "verdict_severity": verdict_severity,
        "confidence_weight": float(confidence or 0.0),
        "kill_shot_overlap": overlap,
        "recency": recency,
    }


def mmr_select(
    candidates: List[Candidate],
    query_embedding: List[float],
    lambda_mult: float = 0.6,
    k: int = 5,
) -> Tuple[List[Candidate], Dict[str, int]]:
    """Maximal Marginal Relevance selection with diversity stats."""
    if not candidates:
        return [], {"num_unique_domains": 0, "num_unique_verdicts": 0}

    selected: List[Candidate] = []
    remaining = candidates.copy()

    # Track diversity stats
    domains_seen: set[str] = set()
    verdicts_seen: set[str] = set()

    # Seed with best ranker score
    remaining.sort(key=lambda c: c.ranker_score, reverse=True)
    if remaining:
        first = remaining.pop(0)
        selected.append(first)
        domains_seen.add(str(first.metadata.get("domain", "")))
        verdicts_seen.add(str(first.metadata.get("verdict_decision", "")))

    while remaining and len(selected) < k:
        best_candidate = None
        best_score = -1.0
        for candidate in remaining:
            relevance = candidate.ranker_score
            diversity_penalty = 0.0
            if selected and candidate.embedding:
                # Penalize similarity to already selected items
                max_sim = max(
                    cosine_similarity(candidate.embedding, s.embedding) if s.embedding else 0.0
                    for s in selected
                )
                diversity_penalty = (1.0 - lambda_mult) * max_sim
            mmr_score = lambda_mult * relevance - diversity_penalty
            if mmr_score > best_score:
                best_score = mmr_score
                best_candidate = candidate
        if best_candidate:
            remaining.remove(best_candidate)
            selected.append(best_candidate)
            domains_seen.add(str(best_candidate.metadata.get("domain", "")))
            verdicts_seen.add(str(best_candidate.metadata.get("verdict_decision", "")))
        else:
            break

    stats = {
        "num_unique_domains": len(domains_seen),
        "num_unique_verdicts": len(verdicts_seen),
    }
    return selected, stats


def to_public_result(candidate: Candidate) -> Dict[str, Any]:
    """Trim internal scoring fields for API use."""
    doc = candidate.document
    return {
        "id": candidate.id,
        "idea_summary": doc.get("idea_summary"),
        "verdict_decision": doc.get("verdict_decision"),
        "overall_score": doc.get("overall_score"),
        "kill_shots": doc.get("kill_shots", [])[:3],
        "assumptions": doc.get("assumptions", []),
        "recommendations": doc.get("recommendations", []),
        "domain": candidate.metadata.get("domain"),
        "confidence": candidate.metadata.get("confidence"),
        "ranker_score": candidate.ranker_score,
        "distance": candidate.distance,
        "timestamp": candidate.metadata.get("timestamp"),
    }
