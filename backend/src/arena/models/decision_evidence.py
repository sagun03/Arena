"""Decision evidence model for historical persistence"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class DecisionEvidence(BaseModel):
    """Persistent evidence from a debate verdict for historical analysis"""

    debate_id: str = Field(..., description="Unique debate identifier")
    source_debate_id: Optional[str] = Field(
        default=None,
        description="Optional source debate id when evidence is reused",
    )
    idea_summary: str = Field(..., description="Short idea summary (first 500 chars of PRD)")
    idea_embedding: List[float] = Field(..., description="Embedding vector for search")
    verdict_decision: str = Field(
        ..., description="Final decision: 'Proceed', 'Pivot', 'Kill', or 'NeedsMoreData'"
    )
    overall_score: int = Field(..., ge=0, le=100, description="Overall scorecard (0-100)")
    kill_shots: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Top 3 kill-shots with title and severity (critical/high/medium)",
    )
    assumptions: List[str] = Field(
        default_factory=list, description="Key assumptions that need validation"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Actionable recommendations for pivot/validation"
    )
    domain: str = Field(
        default="general",
        description="Idea domain (SaaS, Marketplace, FinTech, B2B, B2C, etc.)",
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Judge's confidence in verdict (0.0-1.0)"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="When verdict was issued"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "debate_id": "uuid-123",
                "source_debate_id": "uuid-123",
                "idea_summary": "A marketplace connecting freelance designers with SMBs...",
                "idea_embedding": [0.1, 0.2, 0.3, ...],
                "verdict_decision": "Pivot",
                "overall_score": 42,
                "kill_shots": [
                    {
                        "title": "Market Saturated",
                        "severity": "critical",
                        "description": "Dominated by Fiverr, Upwork, 99designs",
                    }
                ],
                "assumptions": ["Customers willing to pay 30% commission"],
                "recommendations": [
                    "Focus on niche (e.g., UX-only or video design)",
                    "Validate unit economics before scaling",
                ],
                "domain": "Marketplace",
                "confidence": 0.82,
                "timestamp": "2025-12-28T10:30:00",
            }
        }
