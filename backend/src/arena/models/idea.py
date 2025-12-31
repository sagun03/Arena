"""Idea models with dynamic extraction support"""

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class Section(BaseModel):
    """A section extracted from PRD"""

    title: str
    content: str
    category: str = Field(
        description="Category: core, market, technical, business, execution, risks, other"
    )
    key_points: List[str] = Field(default_factory=list)


class ExtractedStructure(BaseModel):
    """Dynamically extracted structure from PRD"""

    sections: List[Section] = Field(default_factory=list)
    key_facts: Dict[str, str] = Field(
        default_factory=dict, description="Key-value pairs extracted from PRD"
    )
    lists: Dict[str, List[Any]] = Field(
        default_factory=dict,
        description=(
            "Lists extracted (competitors, features, risks, etc.) - can be strings or objects"
        ),
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extraction metadata (total_sections, has_technical, etc.)",
    )


class IdeaInput(BaseModel):
    """Simple input model - user just pastes PRD text"""

    prd_text: str = Field(..., description="Raw PRD/plan text from ChatGPT")


class Idea(BaseModel):
    """Internal model used by debate system with dynamic structure"""

    original_prd_text: str = Field(..., description="ALWAYS preserved - all agents access this")
    extracted_structure: ExtractedStructure = Field(
        ..., description="Dynamically extracted structure - no fixed fields"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "original_prd_text": "A platform that connects...",
                "extracted_structure": {
                    "sections": [
                        {
                            "title": "Problem Statement",
                            "content": "...",
                            "category": "core",
                            "key_points": ["..."],
                        }
                    ],
                    "key_facts": {"Target Customer": "...", "Pricing": "..."},
                    "lists": {"Competitors": ["...", "..."]},
                    "metadata": {"total_sections": 5, "has_technical": True},
                },
            }
        }
