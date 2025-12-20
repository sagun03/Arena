"""Arena endpoints"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class IdeaValidationRequest(BaseModel):
    """Request model for idea validation"""

    prd_text: str = Field(..., description="Raw PRD/plan text from ChatGPT or similar")


class IdeaValidationResponse(BaseModel):
    """Response model for idea validation"""

    debate_id: str = Field(..., description="Unique identifier for the debate session")
    message: str = Field(..., description="Status message")


class DebateResponse(BaseModel):
    """Response model for debate state"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    status: str = Field(..., description="Current status of the debate")
    message: str = Field(..., description="Status message")


class VerdictResponse(BaseModel):
    """Response model for verdict"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    verdict: str = Field(..., description="Final verdict")
    message: str = Field(..., description="Status message")


@router.post(
    "/validate",
    response_model=IdeaValidationResponse,
    summary="Validate Idea",
    description="""
    Submit a PRD (Product Requirements Document) or business idea for validation.

    The system will:
    1. Extract structure from the PRD text
    2. Create a debate session with AI agents
    3. Return a debate ID for tracking progress
    """,
    tags=["arena"],
)
async def validate_idea(request: IdeaValidationRequest) -> IdeaValidationResponse:
    """
    Submit idea for validation.

    Args:
        request: Idea validation request containing PRD text

    Returns:
        IdeaValidationResponse: Response containing debate ID
    """
    # TODO: Implement idea validation
    return IdeaValidationResponse(
        debate_id="temp-debate-id", message="Idea validation endpoint - coming soon"
    )


@router.get(
    "/debate/{debate_id}",
    response_model=DebateResponse,
    summary="Get Debate State",
    description="Retrieve the current state of a debate session by its ID",
    tags=["arena"],
)
async def get_debate(
    debate_id: str = Field(..., description="Unique debate identifier")
) -> DebateResponse:
    """
    Get debate state.

    Args:
        debate_id: Unique identifier for the debate

    Returns:
        DebateResponse: Current state of the debate
    """
    # TODO: Implement debate retrieval
    return DebateResponse(
        debate_id=debate_id, status="pending", message="Debate retrieval - coming soon"
    )


@router.get(
    "/debate/{debate_id}/verdict",
    response_model=VerdictResponse,
    summary="Get Verdict",
    description="Retrieve the final verdict and recommendations for a completed debate",
    tags=["arena"],
)
async def get_verdict(
    debate_id: str = Field(..., description="Unique debate identifier")
) -> VerdictResponse:
    """
    Get final verdict.

    Args:
        debate_id: Unique identifier for the debate

    Returns:
        VerdictResponse: Final verdict and recommendations
    """
    # TODO: Implement verdict retrieval
    return VerdictResponse(
        debate_id=debate_id, verdict="pending", message="Verdict retrieval - coming soon"
    )
