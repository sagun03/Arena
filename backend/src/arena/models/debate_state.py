"""Debate state model for LangGraph state machine"""

from typing import Dict, List, Optional, TypedDict

from arena.models.evidence import EvidenceTag
from arena.models.idea import Idea


class DebateState(TypedDict, total=False):
    """
    LangGraph state schema for debate execution.

    This TypedDict defines the state that flows through the debate graph.
    All fields are optional to allow incremental state building.
    """

    # Core idea being debated
    idea: Idea

    # Round tracking
    current_round: int  # 1-5 (Clarification, Attacks, Defense, Cross-Exam, Verdict)
    round_status: str  # "pending", "in_progress", "completed", "failed"

    # Round 1: Clarification
    clarification: Optional[str]
    clarification_questions: Optional[List[str]]
    clarification_articulations: Optional[Dict[str, str]]

    # Round 2: Independent Attacks
    attacks: Optional[Dict[str, str]]  # agent_name -> response
    attack_evidence: Optional[List[EvidenceTag]]  # Evidence from attacks

    # Round 3: Defense
    defense: Optional[str]
    defense_evidence: Optional[List[EvidenceTag]]  # Evidence from defense

    # Round 4: Cross-Examination
    cross_examination: Optional[List[Dict[str, str]]]  # List of challenges
    cross_exam_evidence: Optional[List[EvidenceTag]]  # Evidence from cross-exam

    # Evidence tracking (aggregated across all rounds)
    evidence_tags: List[EvidenceTag]

    # Round 5: Final Verdict
    verdict: Optional[Dict]  # Verdict dict (will be converted to Verdict model)

    # Metadata
    debate_id: str
    transcript: List[Dict[str, str]]  # Full debate history with timestamps
    started_at: Optional[str]  # ISO timestamp
    completed_at: Optional[str]  # ISO timestamp
    error: Optional[str]  # Error message if debate failed
