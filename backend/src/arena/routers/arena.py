"""Arena endpoints"""

from fastapi import APIRouter

router = APIRouter()


@router.post("/validate")
async def validate_idea():
    """Submit idea for validation"""
    # TODO: Implement idea validation
    return {"message": "Idea validation endpoint - coming soon"}


@router.get("/debate/{debate_id}")
async def get_debate(debate_id: str):
    """Get debate state"""
    # TODO: Implement debate retrieval
    return {"debate_id": debate_id, "message": "Debate retrieval - coming soon"}


@router.get("/debate/{debate_id}/verdict")
async def get_verdict(debate_id: str):
    """Get final verdict"""
    # TODO: Implement verdict retrieval
    return {"debate_id": debate_id, "message": "Verdict retrieval - coming soon"}
