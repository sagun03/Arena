"""Arena endpoints"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, Dict

from arena.agents.builder_agent import BuilderAgent
from arena.agents.customer_agent import CustomerAgent
from arena.agents.judge_agent import JudgeAgent
from arena.agents.market_agent import MarketAgent
from arena.agents.skeptic_agent import SkepticAgent
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prd_extractor import extract_idea_from_prd
from arena.models.verdict import Verdict
from arena.state_manager import get_debate_state, save_debate_state
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field

router = APIRouter()


class IdeaValidationRequest(BaseModel):
    """Request model for idea validation"""

    prd_text: str = Field(..., description="Raw PRD/plan text from ChatGPT or similar")


class IdeaValidationResponse(BaseModel):
    """Response model for idea validation"""

    debate_id: str = Field(..., description="Unique identifier for the debate session")
    message: str = Field(..., description="Status message")


class TranscriptEntry(BaseModel):
    """Chat-like transcript entry"""

    agent: str = Field(..., description="Agent name (Judge, Skeptic, Customer, etc.)")
    message: str = Field(..., description="What the agent said")
    timestamp: str = Field(..., description="ISO timestamp")
    round: int | None = Field(None, description="Debate round number")
    type: str | None = Field(None, description="Event type (clarification, attack, defense, etc.)")


class DebateResponse(BaseModel):
    """Response model for debate state"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    status: str = Field(..., description="Status: pending, in_progress, completed, failed")
    transcript: list = Field(default_factory=list, description="Chat-like debate transcript")
    error: str | None = Field(None, description="Error message if debate failed")


class VerdictResponse(BaseModel):
    """Response model for verdict"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    verdict: Verdict | None = Field(None, description="Final verdict if completed")
    status: str = Field(..., description="Status: pending, completed, failed")
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
    try:
        # Generate unique debate ID
        debate_id = str(uuid.uuid4())

        # Create initial debate state
        initial_state: Dict[str, Any] = {
            "debate_id": debate_id,
            "status": "pending",
            "transcript": [],
            "started_at": datetime.utcnow().isoformat(),
        }

        # Save initial state
        await save_debate_state(debate_id, initial_state)

        # Start background debate execution (non-blocking)
        asyncio.create_task(execute_debate(debate_id, request.prd_text))

        return IdeaValidationResponse(
            debate_id=debate_id,
            message="Debate session created successfully. Use debate_id to track progress.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start debate: {str(e)}")


@router.get(
    "/debate/{debate_id}",
    response_model=DebateResponse,
    summary="Get Debate State",
    description="Retrieve the current state of a debate session by its ID",
    tags=["arena"],
)
async def get_debate(
    debate_id: str = Path(..., description="Unique debate identifier")
) -> DebateResponse:
    """
    Get debate state.

    Args:
        debate_id: Unique identifier for the debate

    Returns:
        DebateResponse: Current state of the debate

    Raises:
        HTTPException: If debate not found
    """
    state_dict = await get_debate_state(debate_id)

    if not state_dict:
        raise HTTPException(status_code=404, detail=f"Debate {debate_id} not found")

    # Transform raw transcript into chat-like format
    raw_transcript = state_dict.get("transcript", [])
    chat_transcript = _format_transcript_for_chat(raw_transcript)

    return DebateResponse(
        debate_id=debate_id,
        status=state_dict.get("status", "pending"),
        transcript=chat_transcript,
        error=state_dict.get("error"),
    )


def _format_transcript_for_chat(raw_transcript: list) -> list:
    """
    Transform raw debate transcript into human-readable chat format.

    Extracts key information from JSON responses and presents it as a conversation.

    Args:
        raw_transcript: Raw transcript list from state

    Returns:
        Formatted transcript with agent messages in chat style
    """
    formatted = []

    for entry in raw_transcript:
        agent = entry.get("agent", "System")
        entry_type = entry.get("type", "")
        raw_text = entry.get("text", "")
        timestamp = entry.get("timestamp", "")
        round_num = entry.get("round")

        # Extract human-readable message based on entry type
        message = ""

        if entry_type == "clarification:start":
            message = "Judge is analyzing and clarifying the idea..."

        elif entry_type == "clarification:output":
            # Parse JSON from code blocks and extract key questions
            try:
                # Remove code blocks
                json_str = raw_text
                if json_str.startswith("```json"):
                    json_str = json_str[7:]
                if json_str.startswith("```"):
                    json_str = json_str[3:]
                if json_str.endswith("```"):
                    json_str = json_str[:-3]

                parsed = json.loads(json_str.strip())
                questions = parsed.get("clarification_questions", [])
                gaps = parsed.get("identified_gaps", [])
                quality = parsed.get("quality_score", 0)

                question_summary = "\n".join(
                    [f"• {q[:100]}..." if len(q) > 100 else f"• {q}" for q in questions[:3]]
                )
                message = (
                    f"**Judge's Analysis:**\n\nKey Questions:\n{question_summary}\n\nKey Gaps Identified:\n"
                    + "\n".join([f"• {g}" for g in gaps[:3]])
                    + f"\n\nQuality Score: {quality}/1.0"
                )
            except:
                message = f"Judge analyzed the idea (Quality: {entry.get('summary', {}).get('quality_score', 'N/A')}/1.0)"

        elif entry_type == "round2:start":
            message = "Worker agents (Skeptic, Customer, Market) are analyzing..."

        elif entry_type == "attack":
            # Skeptic attack
            try:
                json_str = raw_text
                if json_str.startswith("```json"):
                    json_str = json_str[7:]
                if json_str.startswith("```"):
                    json_str = json_str[3:]
                if json_str.endswith("```"):
                    json_str = json_str[:-3]
                parsed = json.loads(json_str.strip())
                attacks = parsed.get("fatal_flaws", [])[:2]
                message = f"**Skeptic's Attack:**\n\n" + "\n".join([f"• {a}" for a in attacks])
            except:
                message = "Skeptic provided attack analysis"

        elif entry_type == "customer":
            message = "Customer reality analyst shared insights"

        elif entry_type == "market":
            message = "Market analyst evaluated competition"

        elif entry_type == "defense:start":
            message = "Builder is preparing defense..."

        elif entry_type == "defense":
            try:
                json_str = raw_text
                if json_str.startswith("```json"):
                    json_str = json_str[7:]
                if json_str.startswith("```"):
                    json_str = json_str[3:]
                if json_str.endswith("```"):
                    json_str = json_str[:-3]
                parsed = json.loads(json_str.strip())
                strengths = parsed.get("constrained_defense_points", [])[:2]
                message = f"**Builder's Defense:**\n\n" + "\n".join([f"• {s}" for s in strengths])
            except:
                message = "Builder provided defense"

        elif entry_type == "quality_gate":
            decision = entry.get("summary", {}).get("decision", "unknown")
            score = entry.get("summary", {}).get("quality_score", "N/A")
            message = f"Judge quality gate: {decision} (Score: {score})"

        elif entry_type == "verdict:start":
            message = "Judge is generating final verdict..."

        elif entry_type == "verdict":
            message = "✅ Final verdict generated!"

        elif entry_type == "error":
            message = f"❌ Error: {raw_text}"

        elif agent == "System":
            message = raw_text

        else:
            # Fallback: use the raw text
            message = raw_text[:200] if len(raw_text) > 200 else raw_text

        if message:
            formatted.append(
                {
                    "agent": agent,
                    "message": message,
                    "timestamp": timestamp,
                    "round": round_num,
                    "type": entry_type,
                }
            )

    return formatted


@router.get(
    "/debate/{debate_id}/verdict",
    response_model=VerdictResponse,
    summary="Get Verdict",
    description="Retrieve the final verdict and recommendations for a completed debate",
    tags=["arena"],
)
async def get_verdict(
    debate_id: str = Path(..., description="Unique debate identifier")
) -> VerdictResponse:
    """
    Get final verdict.

    Args:
        debate_id: Unique identifier for the debate

    Returns:
        VerdictResponse: Final verdict and recommendations

    Raises:
        HTTPException: If debate not found or verdict not ready
    """
    state_dict = await get_debate_state(debate_id)

    if not state_dict:
        raise HTTPException(status_code=404, detail=f"Debate {debate_id} not found")

    status = state_dict.get("status", "pending")
    verdict_dict = state_dict.get("verdict")

    if status != "completed" or not verdict_dict:
        return VerdictResponse(
            debate_id=debate_id,
            verdict=None,
            status=status,
            message="Debate is still in progress or not completed yet.",
        )

    # Convert verdict dict to Verdict model
    try:
        verdict = Verdict(**verdict_dict)
        return VerdictResponse(
            debate_id=debate_id,
            verdict=verdict,
            status="completed",
            message="Verdict available",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse verdict: {str(e)}")


@router.delete(
    "/debate/{debate_id}",
    summary="Delete Debate",
    description="Delete a debate session and stop polling",
    tags=["arena"],
)
async def delete_debate(debate_id: str = Path(..., description="Unique debate identifier")) -> dict:
    """
    Delete a debate session.

    Args:
        debate_id: Unique identifier for the debate

    Returns:
        Success message
    """
    deleted = await delete_debate_state(debate_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Debate {debate_id} not found")

    return {"debate_id": debate_id, "message": "Debate deleted successfully", "status": "deleted"}


async def execute_debate(debate_id: str, prd_text: str) -> None:
    """
    Execute the debate workflow in the background and stream updates to state.

    Phases:
    1. Judge clarifies idea
    2. Worker agents attack/analyze (Skeptic, Customer, Market)
    3. Builder provides constrained defense
    4. Judge generates final verdict
    """

    async def append_event(event: Dict[str, Any]) -> None:
        state = await get_debate_state(debate_id) or {}
        transcript = state.get("transcript", [])
        transcript.append(event)
        state.update(
            {
                "transcript": transcript,
                "status": state.get("status", "in_progress"),
                "last_updated": datetime.utcnow().isoformat(),
            }
        )
        await save_debate_state(debate_id, state)

    try:
        # Mark in-progress
        state = await get_debate_state(debate_id) or {}
        state.update(
            {
                "status": "in_progress",
                "last_updated": datetime.utcnow().isoformat(),
            }
        )
        await save_debate_state(debate_id, state)

        # Extract PRD structure
        idea = await extract_idea_from_prd(prd_text)

        # Instantiate LLM and agents
        llm = get_gemini_llm(temperature=0.3)
        judge = JudgeAgent(llm=llm, debate_id=debate_id)
        skeptic = SkepticAgent(debate_id=debate_id)
        customer = CustomerAgent(debate_id=debate_id)
        market = MarketAgent(debate_id=debate_id)
        builder = BuilderAgent(debate_id=debate_id)

        # Round 1: Clarification
        await append_event(
            {
                "agent": "Judge",
                "round": 1,
                "type": "clarification:start",
                "text": "Clarification started",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        clarification = await judge.clarify_idea(idea)
        await append_event(
            {
                "agent": "Judge",
                "round": 1,
                "type": "clarification:output",
                "text": clarification.get("raw_response", ""),
                "summary": {
                    "quality_score": clarification.get("quality_score"),
                    "ready_for_debate": clarification.get("ready_for_debate"),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Round 2: Attacks/Analyses
        await append_event(
            {
                "agent": "System",
                "round": 2,
                "type": "round2:start",
                "text": "Worker agents analyzing from different angles...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        extracted_structure = idea.extracted_structure.model_dump()

        # Skeptic attack
        await append_event(
            {
                "agent": "Skeptic",
                "round": 2,
                "type": "attack:start",
                "text": "🔍 Analyzing fatal flaws, market risks, and business model vulnerabilities...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        skeptic_result = await skeptic.attack_idea(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            previous_context=clarification,
        )
        await append_event(
            {
                "agent": "Skeptic",
                "round": 2,
                "type": "attack",
                "text": skeptic_result.get("raw_response", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Customer analysis
        await append_event(
            {
                "agent": "Customer",
                "round": 2,
                "type": "customer:start",
                "text": "👥 Evaluating customer fit, pain points, and willingness to pay...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        customer_result = await customer.analyze_customer(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            previous_context=clarification,
        )
        await append_event(
            {
                "agent": "Customer",
                "round": 2,
                "type": "customer",
                "text": customer_result.get("raw_response", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Market analysis
        await append_event(
            {
                "agent": "Market",
                "round": 2,
                "type": "market:start",
                "text": "📊 Analyzing competitive landscape, market size, and differentiation...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        market_result = await market.analyze_market(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            previous_context=clarification,
        )
        await append_event(
            {
                "agent": "Market",
                "round": 2,
                "type": "market",
                "text": market_result.get("raw_response", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        attacks = {
            "skeptic": skeptic_result.get("response", ""),
            "customer": customer_result.get("response", ""),
            "market": market_result.get("response", ""),
        }
        round2_evidence = (
            skeptic_result.get("evidence_tags", [])
            + customer_result.get("evidence_tags", [])
            + market_result.get("evidence_tags", [])
        )

        # Optional: Judge quality gate for round 2
        qg2 = await judge.evaluate_quality_gate(
            round_type="attacks",
            round_output=attacks,
            evidence_tags=round2_evidence,
        )
        await append_event(
            {
                "agent": "Judge",
                "round": 2,
                "type": "quality_gate",
                "text": qg2.get("raw_response", ""),
                "summary": {
                    "decision": qg2.get("decision"),
                    "quality_score": qg2.get("quality_score"),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Round 3: Defense
        await append_event(
            {
                "agent": "Builder",
                "round": 3,
                "type": "defense:start",
                "text": "🛡️ Crafting response to attacks and refining idea strategy...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        defense_result = await builder.defend_idea(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            attacks=attacks,
            evidence_tags=round2_evidence,
        )
        await append_event(
            {
                "agent": "Builder",
                "round": 3,
                "type": "defense",
                "text": defense_result.get("raw_response", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Optional: Judge quality gate for defense
        qg3 = await judge.evaluate_quality_gate(
            round_type="defense",
            round_output=defense_result,
            evidence_tags=defense_result.get("evidence_tags", []),
        )
        await append_event(
            {
                "agent": "Judge",
                "round": 3,
                "type": "quality_gate",
                "text": qg3.get("raw_response", ""),
                "summary": {
                    "decision": qg3.get("decision"),
                    "quality_score": qg3.get("quality_score"),
                },
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Round 5: Verdict
        await append_event(
            {
                "agent": "Judge",
                "round": 5,
                "type": "verdict:start",
                "text": "⚖️ Weighing all arguments and generating final verdict...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        verdict = await judge.generate_verdict(
            idea=idea,
            clarification=clarification.get("raw_response", ""),
            attacks=attacks,
            defense=defense_result.get("response", ""),
            cross_examination=[],
            evidence_tags=round2_evidence + defense_result.get("evidence_tags", []),
        )

        # Append final verdict
        await append_event(
            {
                "agent": "Judge",
                "round": 5,
                "type": "verdict",
                "text": (
                    verdict.get("raw_response", "")
                    if isinstance(verdict, dict)
                    else getattr(verdict, "raw_response", "")
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        # Persist final state with verdict
        final_state = await get_debate_state(debate_id) or {}
        final_state.update(
            {
                "status": "completed",
                "verdict": verdict.model_dump() if hasattr(verdict, "model_dump") else verdict,
                "last_updated": datetime.utcnow().isoformat(),
            }
        )
        await save_debate_state(debate_id, final_state)

    except Exception as e:
        # Capture failure in state
        fail_state = await get_debate_state(debate_id) or {}
        fail_state.update(
            {
                "status": "failed",
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat(),
            }
        )
        await save_debate_state(debate_id, fail_state)
        await append_event(
            {
                "agent": "System",
                "type": "error",
                "text": f"Debate failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
