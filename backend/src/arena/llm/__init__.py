"""LLM integration for ARENA"""

from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prd_extractor import extract_idea_from_prd, prepare_idea_for_embedding
from arena.llm.prompts import (
    BUILDER_PROMPT,
    CROSS_EXAMINATION_PROMPT,
    CUSTOMER_PROMPT,
    EVIDENCE_TAGGING_INSTRUCTIONS,
    JUDGE_CLARIFICATION_PROMPT,
    JUDGE_QUALITY_GATE_PROMPT,
    JUDGE_VERDICT_PROMPT,
    MARKET_PROMPT,
    SKEPTIC_PROMPT,
)

__all__ = [
    "get_gemini_llm",
    "extract_idea_from_prd",
    "prepare_idea_for_embedding",
    "EVIDENCE_TAGGING_INSTRUCTIONS",
    "JUDGE_CLARIFICATION_PROMPT",
    "JUDGE_QUALITY_GATE_PROMPT",
    "JUDGE_VERDICT_PROMPT",
    "SKEPTIC_PROMPT",
    "CUSTOMER_PROMPT",
    "MARKET_PROMPT",
    "BUILDER_PROMPT",
    "CROSS_EXAMINATION_PROMPT",
]
