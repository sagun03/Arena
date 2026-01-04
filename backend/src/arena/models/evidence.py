"""Evidence tagging models"""

from enum import Enum

from pydantic import BaseModel, Field


class EvidenceType(str, Enum):
    """Types of evidence tags (aligned with tests)"""

    EVIDENCE = "evidence"
    ASSUMPTION = "assumption"
    NEEDS_VALIDATION = "needs_validation"


class EvidenceSource(BaseModel):
    """Grounded source backing a claim."""

    title: str = Field(..., description="Source title")
    url: str = Field(..., description="Source URL")
    snippet: str | None = Field(None, description="Short excerpt from the source")


class EvidenceTag(BaseModel):
    """Evidence tag for agent claims"""

    text: str = Field(..., description="The claim/evidence text")
    type: EvidenceType = Field(..., description="Type of evidence")
    agent: str = Field(..., description="Agent that made the claim")
    round: int = Field(..., description="Debate round number")
    sources: list[EvidenceSource] = Field(
        default_factory=list,
        description="Grounded sources supporting this claim",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Market size is $10B",
                "type": "assumption",
                "agent": "Skeptic",
                "round": 2,
                "sources": [
                    {
                        "title": "Market Report 2024",
                        "url": "https://example.com/report",
                        "snippet": "The market is estimated at $10B...",
                    }
                ],
            }
        }
