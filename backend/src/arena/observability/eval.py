"""Offline evaluation helpers for Phase 2 learning layer."""

from __future__ import annotations

import json
from collections import Counter
from statistics import fmean
from typing import Any, Dict, List, Tuple


def _pair_runs_by_idea(runs: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any]]]:
    """Pair with-history vs no-history runs by idea_id for comparisons."""
    history = {r.get("idea_id"): r for r in runs if r.get("with_history")}
    baseline = {r.get("idea_id"): r for r in runs if not r.get("with_history")}
    shared_ids = set(history.keys()) & set(baseline.keys())
    return [(history[i], baseline[i]) for i in shared_ids if i]


def verdict_stability(pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]) -> float:
    if not pairs:
        return 0.0
    matches = [1.0 if a.get("decision") == b.get("decision") else 0.0 for a, b in pairs]
    return fmean(matches) if matches else 0.0


def precedent_lift(pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]) -> float:
    if not pairs:
        return 0.0
    lifts = [a.get("score", 0) - b.get("score", 0) for a, b in pairs]
    return fmean(lifts) if lifts else 0.0


def kill_shot_precision(pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]) -> float:
    if not pairs:
        return 0.0
    precisions: List[float] = []
    for a, b in pairs:
        a_ks = {ks.get("title") for ks in a.get("kill_shots", []) if ks.get("title")}
        b_ks = {ks.get("title") for ks in b.get("kill_shots", []) if ks.get("title")}
        if not a_ks:
            continue
        overlap = len(a_ks & b_ks)
        precisions.append(overlap / len(a_ks))
    return fmean(precisions) if precisions else 0.0


def precedent_agreement_rate(runs: List[Dict[str, Any]]) -> float:
    """Share of runs where multiple agents referenced the same precedent id."""
    if not runs:
        return 0.0
    agreements = []
    for run in runs:
        refs = run.get("precedent_refs", {}) or {}
        counter: Counter[str] = Counter()
        for agent_refs in refs.values():
            for ref in agent_refs or []:
                counter[str(ref)] += 1
        if not counter:
            continue
        max_refs = counter.most_common(1)[0][1]
        agreements.append(1.0 if max_refs >= 2 else 0.0)
    return fmean(agreements) if agreements else 0.0


def agent_disagreement_entropy(runs: List[Dict[str, Any]]) -> float:
    """Simple entropy over agent decisions if present."""
    import math

    entropies: List[float] = []
    for run in runs:
        agent_decisions = run.get("agent_decisions", {}) or {}
        counts = Counter(agent_decisions.values())
        total = sum(counts.values())
        if total == 0:
            continue
        entropy = -sum((c / total) * math.log2(c / total) for c in counts.values() if c)
        entropies.append(entropy)
    return fmean(entropies) if entropies else 0.0


def compute_metrics(runs: List[Dict[str, Any]]) -> Dict[str, Any]:
    pairs = _pair_runs_by_idea(runs)
    metrics = {
        "verdict_stability": verdict_stability(pairs),
        "precedent_lift": precedent_lift(pairs),
        "kill_shot_precision": kill_shot_precision(pairs),
        "precedent_agreement_rate": precedent_agreement_rate(runs),
        "agent_disagreement_entropy": agent_disagreement_entropy(runs),
    }
    return metrics


def pretty_print(metrics: Dict[str, Any]) -> str:
    return json.dumps(metrics, indent=2)
