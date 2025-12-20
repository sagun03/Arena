"""Evidence tagging models"""

from enum import Enum

from pydantic import BaseModel, Field


class EvidenceType(str, Enum):
    """Types of evidence tags"""

    VERIFIED = "Verified"
    ASSUMPTION = "Assumption"
    NEEDS_VALIDATION = "NeedsValidation"


class EvidenceTag(BaseModel):
    """Evidence tag for agent claims"""

    text: str = Field(..., description="The claim/evidence text")
    type: EvidenceType = Field(..., description="Type of evidence")
    agent: str = Field(..., description="Agent that made the claim")
    round: int = Field(..., description="Debate round number")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Market size is $10B",
                "type": "Assumption",
                "agent": "Skeptic",
                "round": 2,
            }
        }
