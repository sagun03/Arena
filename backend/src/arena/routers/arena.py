"""Arena endpoints"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

import anyio
from arena.agents.builder_agent import BuilderAgent
from arena.agents.cross_exam_agent import CrossExamAgent
from arena.agents.customer_agent import CustomerAgent
from arena.agents.judge_agent import JudgeAgent
from arena.agents.market_agent import MarketAgent
from arena.agents.skeptic_agent import SkepticAgent
from arena.auth.dependencies import require_auth
from arena.auth.firebase import get_firestore_client
from arena.billing.credits import (
    InsufficientCreditsError,
    consume_credits,
    grant_credits,
)
from arena.grounding.google_search import search_google
from arena.llm.gemini_client import get_gemini_llm
from arena.llm.prd_extractor import extract_idea_from_prd
from arena.models.decision_evidence import DecisionEvidence
from arena.models.evidence import EvidenceTag
from arena.models.idea import ExtractedStructure, Idea, Section
from arena.models.verdict import Verdict
from arena.monitoring.metrics import logger
from arena.state_manager import get_debate_state, save_debate_state
from arena.vectorstore.embeddings import embed_texts
from arena.vectorstore.historical_store import get_historical_store
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from firebase_admin import firestore
from pydantic import BaseModel, Field

router = APIRouter(dependencies=[Depends(require_auth)])

VALIDATION_CREDIT_COSTS = {
    "short": 0,
    "long": 2,
}

SHORT_MODE_MAX_CHARS = 400
SHORT_MODE_MIN_LINES = 2
SHORT_MODE_MAX_LINES = 5


def _build_grounding_query(idea: Idea, extracted_structure: dict) -> str:
    metadata = (
        extracted_structure.get("metadata", {}) if isinstance(extracted_structure, dict) else {}
    )
    key_facts = (
        extracted_structure.get("key_facts", {}) if isinstance(extracted_structure, dict) else {}
    )
    title = metadata.get("title") or key_facts.get("Title")
    if not title:
        first_line = idea.original_prd_text.splitlines()[0] if idea.original_prd_text else ""
        title = first_line[:120]
    return f"{title} competitors alternatives market"


class QuickRoastLimitError(RuntimeError):
    """Raised when daily quick roast limit is exceeded."""


def _dump_evidence_tags(tags: list[EvidenceTag]) -> list[dict]:
    return [tag.model_dump() if hasattr(tag, "model_dump") else tag for tag in tags]


def _enforce_quick_roast_limit(decoded: Dict[str, Any]) -> None:
    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid or not email:
        raise HTTPException(status_code=401, detail="Missing uid/email in token")

    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    today = datetime.utcnow().date().isoformat()
    provider = (decoded.get("firebase") or {}).get("sign_in_provider")
    login_provider = "google" if provider == "google.com" else "email"
    name = decoded.get("name") or email.split("@")[0]

    @firestore.transactional
    def _update(transaction: firestore.Transaction) -> None:
        snapshot = user_ref.get(transaction=transaction)
        data = snapshot.to_dict() if snapshot.exists else {}
        last_date = data.get("quick_roast_last_date")
        count = int(data.get("quick_roast_count_today") or 0)
        if last_date != today:
            count = 0
        if count >= 1:
            raise QuickRoastLimitError("Quick Roast limit reached. Try again tomorrow.")
        if not snapshot.exists:
            transaction.set(
                user_ref,
                {
                    "uid": uid,
                    "name": name,
                    "email": email.lower(),
                    "createdAt": datetime.utcnow().isoformat(),
                    "verified": decoded.get("email_verified", False),
                    "loginProvider": login_provider,
                    "credits": 0,
                },
                merge=True,
            )
        transaction.set(
            user_ref,
            {
                "quick_roast_last_date": today,
                "quick_roast_count_today": count + 1,
                "updatedAt": datetime.utcnow().isoformat(),
            },
            merge=True,
        )

    _update(db.transaction())


def detect_idea_domain(
    extracted_structure: Dict[str, Any],
    explicit_domain: Optional[str] = None,
    debate_id: Optional[str] = None,
) -> str:
    """Detect domain from key facts, optionally overridden by user-provided domain."""

    idea_domain = "general"
    if extracted_structure.get("key_facts"):
        key_facts_str = json.dumps(extracted_structure.get("key_facts", {})).lower()
        if "saas" in key_facts_str or "software" in key_facts_str:
            idea_domain = "SaaS"
        elif "marketplace" in key_facts_str or "platform" in key_facts_str:
            idea_domain = "Marketplace"
        elif "fintech" in key_facts_str or "finance" in key_facts_str:
            idea_domain = "FinTech"
        elif "b2b" in key_facts_str:
            idea_domain = "B2B"
        elif "b2c" in key_facts_str:
            idea_domain = "B2C"

    if explicit_domain:
        if explicit_domain != idea_domain:
            logger.info(
                "domain_disagreement debate_id=%s explicit=%s detected=%s",
                debate_id,
                explicit_domain,
                idea_domain,
            )
        return explicit_domain

    return idea_domain


def format_agent_response(
    agent_result: Dict[str, Any], agent_name: str
) -> tuple[str, Dict[str, Any]]:
    """
    Extract and format structured data from agent response.

    Args:
        agent_result: Result dict from agent with 'response', 'raw_response', 'evidence_tags'
        agent_name: Name of the agent (Customer, Market, Builder, Skeptic)

    Returns:
        Tuple of (formatted_text, metadata_dict)
    """
    response_obj = agent_result.get("response", {})
    metadata = {
        "agent": agent_name,
        "evidence_count": len(agent_result.get("evidence_tags", [])),
    }

    # Extract key findings and add metadata based on agent type
    key_points = []

    if agent_name == "Customer":
        # Extract customer-specific insights
        if isinstance(response_obj, dict):
            problem_validation = response_obj.get("problem_validation", {})
            if isinstance(problem_validation, dict):
                pain_level = problem_validation.get("pain_level", "N/A")
                problem_exists = problem_validation.get("problem_exists", "Unknown")
                key_points.append(f"Problem exists: {problem_exists} (Pain level: {pain_level})")
                metadata["problem_validated"] = problem_exists

            willingness = response_obj.get("willingness_to_pay", {})
            if isinstance(willingness, dict):
                will_pay = willingness.get("will_pay", "Unknown")
                price = willingness.get("estimated_price", "N/A")
                key_points.append(f"Willingness to pay: {will_pay} (Est. ${price})")
                metadata["willingness"] = will_pay

            critical_concerns = response_obj.get("critical_concerns", [])
            if critical_concerns:
                concern_list = (
                    ", ".join(critical_concerns[:2])
                    if isinstance(critical_concerns, list)
                    else str(critical_concerns)[:100]
                )
                key_points.append(f"Key concerns: {concern_list}")
                metadata["concerns_count"] = (
                    len(critical_concerns) if isinstance(critical_concerns, list) else 1
                )

    elif agent_name == "Market":
        # Extract market-specific insights
        if isinstance(response_obj, dict):
            market_analysis = response_obj.get("market_analysis", {})
            if isinstance(market_analysis, dict):
                market_size = market_analysis.get("market_size_realistic", "Unknown")
                growth = market_analysis.get("market_growth", "N/A")
                key_points.append(f"Market size: {market_size}, Growth: {growth}")
                metadata["market_realistic"] = market_size

            saturation = response_obj.get("market_saturation", {})
            if isinstance(saturation, dict):
                is_saturated = saturation.get("is_saturated", "Unknown")
                level = saturation.get("saturation_level", "N/A")
                key_points.append(f"Market saturation: {is_saturated} ({level})")
                metadata["saturation"] = is_saturated

            competitors = response_obj.get("competition", [])
            if competitors and isinstance(competitors, list):
                comp_count = len(competitors)
                key_points.append(f"Major competitors identified: {comp_count}")
                metadata["competitor_count"] = comp_count

            risks = response_obj.get("market_risks", [])
            if risks:
                risk_summary = ", ".join(risks[:2]) if isinstance(risks, list) else str(risks)[:100]
                key_points.append(f"Market risks: {risk_summary}")
                metadata["risks_count"] = len(risks) if isinstance(risks, list) else 1

    elif agent_name == "Builder":
        # Extract builder-specific insights
        if isinstance(response_obj, dict):
            technical = response_obj.get("technical_feasibility", {})
            if isinstance(technical, dict):
                feasible = technical.get("is_feasible", "Unknown")
                key_points.append(f"Technical feasibility: {feasible}")
                metadata["technically_feasible"] = feasible

            business = response_obj.get("business_feasibility", {})
            if isinstance(business, dict):
                viable = business.get("is_viable", "Unknown")
                key_points.append(f"Business viability: {viable}")
                metadata["business_viable"] = viable

            challenges = response_obj.get("technical_challenges", [])
            if challenges:
                challenge_summary = (
                    ", ".join(challenges[:2])
                    if isinstance(challenges, list)
                    else str(challenges)[:100]
                )
                key_points.append(f"Challenges: {challenge_summary}")
                metadata["challenges_count"] = (
                    len(challenges) if isinstance(challenges, list) else 1
                )

            risks = response_obj.get("business_risks", [])
            if risks:
                risk_summary = ", ".join(risks[:2]) if isinstance(risks, list) else str(risks)[:100]
                key_points.append(f"Business risks: {risk_summary}")
                metadata["business_risks_count"] = len(risks) if isinstance(risks, list) else 1

    elif agent_name == "Skeptic":
        # Extract skeptic-specific insights
        if isinstance(response_obj, dict):
            kill_shots = response_obj.get("kill_shots", [])
            if kill_shots:
                shot_count = len(kill_shots) if isinstance(kill_shots, list) else 1
                top_shot = (
                    kill_shots[0].get("title", "Unknown")
                    if isinstance(kill_shots, list) and kill_shots
                    else "Unknown"
                )
                key_points.append(f"Fatal flaws identified: {shot_count} (Primary: {top_shot})")
                metadata["kill_shots_count"] = shot_count

            risks = response_obj.get("business_risks", [])
            if risks:
                risk_summary = ", ".join(risks[:2]) if isinstance(risks, list) else str(risks)[:100]
                key_points.append(f"Key risks: {risk_summary}")
                metadata["risks_count"] = len(risks) if isinstance(risks, list) else 1

    # Format final text: key points first, then raw response
    if key_points:
        formatted_text = (
            "**Key Findings:**\n"
            + "\n".join(f"• {point}" for point in key_points)
            + "\n\n**Detailed Analysis:**\n"
            + agent_result.get("raw_response", "")
        )
    else:
        formatted_text = agent_result.get("raw_response", "")

    return formatted_text, metadata


class IdeaValidationRequest(BaseModel):
    """Request model for idea validation"""

    prd_text: str = Field(..., description="Raw PRD/plan text from ChatGPT or similar")
    mode: Literal["short", "long"] = Field(
        default="long",
        description="Validation mode: short (2 rounds) or long (full debate).",
    )
    domain: Optional[str] = Field(
        default=None,
        description="Optional domain override (SaaS, Marketplace, FinTech, B2B, B2C, etc.)",
    )


class IdeaValidationResponse(BaseModel):
    """Response model for idea validation"""

    debate_id: str = Field(..., description="Unique identifier for the debate session")
    message: str = Field(..., description="Status message")
    idea_title: str = Field(default="Untitled Idea", description="Extracted idea title for display")


class TranscriptEntry(BaseModel):
    """Chat-like transcript entry"""

    agent: str = Field(..., description="Agent name (Judge, Skeptic, Customer, etc.)")
    message: str = Field(..., description="What the agent said")
    timestamp: str = Field(..., description="ISO timestamp")
    round: int | None = Field(None, description="Debate round number")
    type: str | None = Field(None, description="Event type (clarification, attack, defense, etc.)")
    metadata: Dict[str, Any] | None = Field(
        None, description="Additional metadata (confidence scores, analysis metrics, etc.)"
    )


class DebateResponse(BaseModel):
    """Response model for debate state"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    status: str = Field(..., description="Status: pending, in_progress, completed, failed")
    current_round: int = Field(0, description="Current round number")
    round_status: str = Field(
        "pending", description="Round status: pending/in_progress/completed/failed"
    )
    transcript: list = Field(default_factory=list, description="Chat-like debate transcript")
    error: str | None = Field(None, description="Error message if debate failed")
    idea_title: str = Field(default="Untitled Idea", description="Title of the idea being debated")


class VerdictResponse(BaseModel):
    """Response model for verdict"""

    debate_id: str = Field(..., description="Unique identifier for the debate")
    verdict: Verdict | None = Field(None, description="Final verdict if completed")
    status: str = Field(..., description="Status: pending, completed, failed")
    message: str = Field(..., description="Status message")
    idea_title: Optional[str] = Field(None, description="Title of the idea being debated")
    started_at: Optional[str] = Field(None, description="Debate start timestamp (ISO)")
    last_updated: Optional[str] = Field(None, description="Last update timestamp (ISO)")


class ExecutionTask(BaseModel):
    """Execution task for de-risk checklist or sprint plan."""

    id: str
    title: Optional[str] = None
    rationale: Optional[str] = None
    priority: Optional[str] = None
    owner: Optional[str] = None
    day: Optional[int] = None
    task: Optional[str] = None
    success_criteria: Optional[str] = None
    completed: bool = False


class ExecutionPlanResponse(BaseModel):
    debate_id: str
    checklist: list[ExecutionTask] = Field(default_factory=list)
    sprint_plan: list[ExecutionTask] = Field(default_factory=list)


class ExecutionTaskUpdate(BaseModel):
    task_type: Literal["checklist", "sprint"] = Field(..., description="Which task list")
    completed: bool = Field(..., description="Completion status")


class VerdictRecord(BaseModel):
    """Stored verdict document returned to the frontend."""

    id: str
    debate_id: str
    status: str
    decision: Optional[str] = None
    idea_title: Optional[str] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    verdict: Dict[str, Any] | None = None


class VerdictListResponse(BaseModel):
    """List response for verdicts."""

    verdicts: list[VerdictRecord]


class VerdictCreateRequest(BaseModel):
    """Payload for persisting a verdict to Firestore."""

    debate_id: str = Field(..., description="Debate identifier to use as document ID")
    verdict: Verdict | Dict[str, Any] | None = Field(
        None, description="Structured verdict payload from the debate endpoint"
    )
    status: str = Field(..., description="Verdict status (pending/completed/failed)")
    idea_title: Optional[str] = Field(None, description="Optional idea title for display")


def _serialize_timestamp(ts: Any) -> Optional[str]:
    """Convert Firestore timestamps or datetimes into ISO strings."""

    if ts is None:
        return None

    if isinstance(ts, str):
        try:
            parsed = datetime.fromisoformat(ts)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc).isoformat()
            return parsed.isoformat()
        except ValueError:
            return ts

    try:
        return ts.isoformat()
    except Exception:  # noqa: BLE001
        try:
            return ts.to_datetime().isoformat()
        except Exception:  # noqa: BLE001
            try:
                return ts.ToDatetime().isoformat()
            except Exception:  # noqa: BLE001
                return str(ts)


def _normalize_verdict_payload(
    verdict: Verdict | Dict[str, Any] | None,
) -> tuple[Verdict | None, Dict[str, Any] | None]:
    """Return both a Pydantic Verdict (if parsable) and a plain dict copy."""

    if verdict is None:
        return None, None

    if isinstance(verdict, Verdict):
        return verdict, verdict.model_dump()

    if isinstance(verdict, dict):
        try:
            verdict_model = Verdict(**verdict)
            return verdict_model, verdict_model.model_dump()
        except Exception:  # noqa: BLE001
            return None, verdict

    return None, None


def _build_firestore_record(
    *,
    debate_id: str,
    uid: str,
    status: str,
    idea_title: Optional[str],
    verdict: Verdict | Dict[str, Any] | None,
    created_at: datetime,
    existing_created_at: Any | None,
) -> Dict[str, Any]:
    """Normalize verdict payload into the Firestore document shape."""

    verdict_model, verdict_dict = _normalize_verdict_payload(verdict)

    decision = None
    confidence = None
    reasoning = None
    scorecard = None
    kill_shots = None
    assumptions = None
    test_plan = None
    risk_checklist = None
    sprint_plan = None

    if verdict_model:
        decision = verdict_model.decision
        confidence = verdict_model.confidence
        reasoning = verdict_model.reasoning
        scorecard = verdict_model.scorecard.model_dump()
        kill_shots = [
            {
                "title": ks.title,
                "description": ks.description,
                "severity": ks.severity,
                "agent": ks.agent,
            }
            for ks in verdict_model.kill_shots
        ]
        assumptions = verdict_model.assumptions
        test_plan = [
            {
                "day": item.day,
                "task": item.task,
                "success_criteria": item.success_criteria,
            }
            for item in verdict_model.test_plan
        ]
        risk_checklist = [
            {
                "title": item.title,
                "rationale": item.rationale,
                "priority": item.priority,
                "owner": item.owner,
            }
            for item in verdict_model.risk_checklist
        ]
        sprint_plan = [
            {
                "day": item.day,
                "task": item.task,
                "success_criteria": item.success_criteria,
            }
            for item in verdict_model.sprint_plan
        ]
    elif isinstance(verdict_dict, dict):
        decision = verdict_dict.get("decision")
        confidence = verdict_dict.get("confidence")
        reasoning = verdict_dict.get("reasoning")
        scorecard = verdict_dict.get("scorecard")
        kill_shots = verdict_dict.get("kill_shots") or verdict_dict.get("killShots")
        assumptions = verdict_dict.get("assumptions")
        test_plan = verdict_dict.get("test_plan") or verdict_dict.get("testPlan")
        risk_checklist = verdict_dict.get("risk_checklist") or verdict_dict.get("riskChecklist")
        sprint_plan = verdict_dict.get("sprint_plan") or verdict_dict.get("sprintPlan")

    record = {
        "debate_id": debate_id,
        "user_id": uid,
        "idea_title": idea_title,
        "status": status,
        "decision": decision,
        "confidence": confidence,
        "reasoning": reasoning,
        "scorecard": scorecard,
        "kill_shots": kill_shots,
        "assumptions": assumptions,
        "test_plan": test_plan,
        "risk_checklist": risk_checklist,
        "sprint_plan": sprint_plan,
        "verdict": verdict_dict,
        "created_at": existing_created_at or created_at,
        "updated_at": created_at,
    }

    return record


def _extract_idea_title(prd_text: str) -> str:
    """Derive a user-friendly idea title from PRD text."""

    if not prd_text:
        return "Untitled Idea"

    lines = [line.strip(" #*\t-") for line in prd_text.splitlines() if line.strip()]
    candidate = lines[0] if lines else prd_text.strip()

    # Truncate to keep it display-friendly
    candidate = candidate[:140].strip()

    return candidate or "Untitled Idea"


def _initialize_execution_plan(
    debate_id: str,
    verdict_data: Dict[str, Any],
) -> Dict[str, Any]:
    checklist = verdict_data.get("risk_checklist") or []
    sprint_plan = verdict_data.get("sprint_plan") or verdict_data.get("test_plan") or []

    def _build_checklist(items: list[dict]) -> list[dict]:
        built = []
        for item in items:
            built.append(
                {
                    "id": str(uuid.uuid4()),
                    "title": item.get("title"),
                    "rationale": item.get("rationale"),
                    "priority": item.get("priority"),
                    "owner": item.get("owner"),
                    "completed": False,
                }
            )
        return built

    def _build_sprint(items: list[dict]) -> list[dict]:
        built = []
        for item in items:
            built.append(
                {
                    "id": str(uuid.uuid4()),
                    "day": item.get("day"),
                    "task": item.get("task"),
                    "success_criteria": item.get("success_criteria"),
                    "completed": False,
                }
            )
        return built

    return {
        "debate_id": debate_id,
        "checklist": _build_checklist(checklist),
        "sprint_plan": _build_sprint(sprint_plan),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def _format_verdict_record(doc_id: str, data: Dict[str, Any]) -> VerdictRecord:
    """Convert Firestore doc data into API response model."""

    return VerdictRecord(
        id=doc_id,
        debate_id=data.get("debate_id") or data.get("debateId") or doc_id,
        status=data.get("status", "pending"),
        decision=data.get("decision"),
        idea_title=data.get("idea_title") or data.get("ideaTitle"),
        confidence=data.get("confidence"),
        reasoning=data.get("reasoning"),
        created_at=_serialize_timestamp(data.get("created_at") or data.get("createdAt")),
        updated_at=_serialize_timestamp(data.get("updated_at") or data.get("updatedAt")),
        verdict=data.get("verdict"),
    )


def _get_state_owner_id(state: Dict[str, Any]) -> Optional[str]:
    return state.get("user_id") or state.get("userId")


def _enforce_state_owner(state: Dict[str, Any], uid: str) -> None:
    owner_id = _get_state_owner_id(state)
    if not owner_id:
        raise HTTPException(status_code=403, detail="Debate ownership missing")
    if owner_id != uid:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get(
    "/verdicts",
    response_model=VerdictListResponse,
    summary="List Verdicts",
    description="List verdicts for the authenticated user (most recent first)",
    tags=["arena"],
)
async def list_verdicts(
    limit: int
    | None = Query(None, ge=1, le=100, description="Maximum verdicts to return (omit for all)"),
    user: Dict[str, Any] = Depends(require_auth),
) -> VerdictListResponse:
    """Return recent verdicts scoped to the authenticated user."""

    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    try:
        db = await anyio.to_thread.run_sync(get_firestore_client)
        verdicts_ref = db.collection("verdicts")

        query = verdicts_ref.where("user_id", "==", uid).order_by(
            "created_at", direction=firestore.Query.DESCENDING
        )
        if limit:
            query = query.limit(limit)

        snapshots = await anyio.to_thread.run_sync(lambda: list(query.stream()))
        verdicts = [_format_verdict_record(doc.id, doc.to_dict()) for doc in snapshots]
        if verdicts:
            return VerdictListResponse(verdicts=verdicts)

        fallback_query = verdicts_ref.where("userId", "==", uid).order_by(
            "createdAt", direction=firestore.Query.DESCENDING
        )
        if limit:
            fallback_query = fallback_query.limit(limit)
        fallback_snapshots = await anyio.to_thread.run_sync(lambda: list(fallback_query.stream()))
        verdicts = [_format_verdict_record(doc.id, doc.to_dict()) for doc in fallback_snapshots]
        return VerdictListResponse(verdicts=verdicts)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to fetch verdicts: {exc}") from exc


@router.get(
    "/verdicts/{debate_id}",
    response_model=VerdictRecord,
    summary="Get Verdict Document",
    description="Fetch a single verdict document if it belongs to the authenticated user.",
    tags=["arena"],
)
async def get_verdict_document(
    debate_id: str = Path(..., description="Debate identifier / verdict document ID"),
    user: Dict[str, Any] = Depends(require_auth),
) -> VerdictRecord:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    db = await anyio.to_thread.run_sync(get_firestore_client)
    doc_ref = db.collection("verdicts").document(debate_id)
    snapshot = await anyio.to_thread.run_sync(doc_ref.get)

    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Verdict not found")

    data = snapshot.to_dict() or {}
    if (data.get("user_id") or data.get("userId")) != uid:
        raise HTTPException(status_code=403, detail="Forbidden")

    return _format_verdict_record(snapshot.id, data)


@router.post(
    "/verdicts",
    response_model=VerdictRecord,
    status_code=201,
    summary="Create Verdict",
    description="Persist a verdict to Firestore for the authenticated user.",
    tags=["arena"],
)
async def create_verdict_document(
    payload: VerdictCreateRequest,
    user: Dict[str, Any] = Depends(require_auth),
) -> VerdictRecord:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    now = datetime.utcnow()

    try:
        db = await anyio.to_thread.run_sync(get_firestore_client)
        doc_ref = db.collection("verdicts").document(payload.debate_id)
        existing_snapshot = await anyio.to_thread.run_sync(doc_ref.get)
        existing_data = existing_snapshot.to_dict() if existing_snapshot.exists else {}
        existing_owner = (
            existing_data.get("user_id") or existing_data.get("userId") if existing_data else None
        )
        if existing_owner and existing_owner != uid:
            raise HTTPException(status_code=403, detail="Forbidden")

        idea_title = (
            payload.idea_title or existing_data.get("idea_title") or existing_data.get("ideaTitle")
        )
        if not idea_title:
            state = await get_debate_state(payload.debate_id)
            idea_title = (state or {}).get("idea_title") or (state or {}).get("ideaTitle")

        record = _build_firestore_record(
            debate_id=payload.debate_id,
            uid=uid,
            status=payload.status,
            idea_title=idea_title,
            verdict=payload.verdict,
            created_at=now,
            existing_created_at=(existing_data or {}).get("created_at")
            or (existing_data or {}).get("createdAt"),
        )

        # Preserve existing fields when payload omits them
        if existing_data:
            record["verdict"] = record.get("verdict") or existing_data.get("verdict")
            record["decision"] = record.get("decision") or existing_data.get("decision")
            record["confidence"] = record.get("confidence") or existing_data.get("confidence")
            record["reasoning"] = record.get("reasoning") or existing_data.get("reasoning")
            record["scorecard"] = record.get("scorecard") or existing_data.get("scorecard")
            record["kill_shots"] = (
                record.get("kill_shots")
                or existing_data.get("kill_shots")
                or existing_data.get("killShots")
            )
            record["assumptions"] = record.get("assumptions") or existing_data.get("assumptions")
            record["test_plan"] = (
                record.get("test_plan")
                or existing_data.get("test_plan")
                or existing_data.get("testPlan")
            )

        await anyio.to_thread.run_sync(doc_ref.set, record, True)

        verdict_payload = record.get("verdict") or existing_data.get("verdict")
        if verdict_payload:
            exec_ref = db.collection("execution_plans").document(payload.debate_id)
            exec_snapshot = await anyio.to_thread.run_sync(exec_ref.get)
            if not exec_snapshot.exists:
                plan = _initialize_execution_plan(payload.debate_id, verdict_payload)
                plan["uid"] = uid
                await anyio.to_thread.run_sync(exec_ref.set, plan, True)

        return _format_verdict_record(doc_ref.id, record)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to store verdict: {exc}") from exc


@router.get(
    "/execution/{debate_id}",
    response_model=ExecutionPlanResponse,
    summary="Get Execution Plan",
    description="Fetch the execution checklist and sprint plan for a verdict.",
    tags=["arena"],
)
async def get_execution_plan(
    debate_id: str,
    user: Dict[str, Any] = Depends(require_auth),
) -> ExecutionPlanResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    db = await anyio.to_thread.run_sync(get_firestore_client)
    plan_ref = db.collection("execution_plans").document(debate_id)
    plan_snapshot = await anyio.to_thread.run_sync(plan_ref.get)

    if plan_snapshot.exists:
        plan_data = plan_snapshot.to_dict() or {}
        owner = plan_data.get("uid") or plan_data.get("user_id") or plan_data.get("userId")
        if owner and owner != uid:
            raise HTTPException(status_code=403, detail="Forbidden")
        return ExecutionPlanResponse(
            debate_id=debate_id,
            checklist=[ExecutionTask(**item) for item in plan_data.get("checklist", [])],
            sprint_plan=[ExecutionTask(**item) for item in plan_data.get("sprint_plan", [])],
        )

    verdict_ref = db.collection("verdicts").document(debate_id)
    verdict_snapshot = await anyio.to_thread.run_sync(verdict_ref.get)
    verdict_data = verdict_snapshot.to_dict() if verdict_snapshot.exists else {}
    verdict_owner = (
        verdict_data.get("user_id") or verdict_data.get("userId") if verdict_data else None
    )
    if verdict_owner and verdict_owner != uid:
        raise HTTPException(status_code=403, detail="Forbidden")

    verdict_payload = (verdict_data or {}).get("verdict")
    if not verdict_payload:
        state = await get_debate_state(debate_id)
        if not state:
            raise HTTPException(status_code=404, detail="Execution plan not available yet")
        _enforce_state_owner(state, uid)
        verdict_payload = state.get("verdict")

    if not verdict_payload:
        raise HTTPException(status_code=404, detail="Execution plan not available yet")

    plan = _initialize_execution_plan(debate_id, verdict_payload)
    plan["uid"] = uid
    await anyio.to_thread.run_sync(plan_ref.set, plan, True)
    return ExecutionPlanResponse(
        debate_id=debate_id,
        checklist=[ExecutionTask(**item) for item in plan.get("checklist", [])],
        sprint_plan=[ExecutionTask(**item) for item in plan.get("sprint_plan", [])],
    )


@router.post(
    "/execution/{debate_id}/tasks/{task_id}",
    response_model=ExecutionPlanResponse,
    summary="Update Execution Task",
    description="Toggle completion for a checklist or sprint task.",
    tags=["arena"],
)
async def update_execution_task(
    debate_id: str,
    task_id: str,
    payload: ExecutionTaskUpdate,
    user: Dict[str, Any] = Depends(require_auth),
) -> ExecutionPlanResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    db = await anyio.to_thread.run_sync(get_firestore_client)
    plan_ref = db.collection("execution_plans").document(debate_id)
    plan_snapshot = await anyio.to_thread.run_sync(plan_ref.get)
    if not plan_snapshot.exists:
        raise HTTPException(status_code=404, detail="Execution plan not found")

    plan_data = plan_snapshot.to_dict() or {}
    owner = plan_data.get("uid") or plan_data.get("user_id") or plan_data.get("userId")
    if owner and owner != uid:
        raise HTTPException(status_code=403, detail="Forbidden")

    key = "checklist" if payload.task_type == "checklist" else "sprint_plan"
    tasks = list(plan_data.get(key, []))
    updated = False
    for item in tasks:
        if item.get("id") == task_id:
            item["completed"] = payload.completed
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    plan_data[key] = tasks
    plan_data["updated_at"] = datetime.utcnow()
    await anyio.to_thread.run_sync(plan_ref.set, plan_data, True)

    return ExecutionPlanResponse(
        debate_id=debate_id,
        checklist=[ExecutionTask(**item) for item in plan_data.get("checklist", [])],
        sprint_plan=[ExecutionTask(**item) for item in plan_data.get("sprint_plan", [])],
    )


@router.get(
    "/graph/structure",
    summary="Graph Structure",
    description="Get static debate graph nodes, edges, and mermaid diagram",
    tags=["arena"],
)
async def get_graph_structure() -> Dict[str, Any]:
    """
    Return the static debate graph structure.
    """
    nodes = [
        {"id": "clarification", "label": "Round 1: Clarification"},
        {"id": "attacks", "label": "Round 2: Attacks & Analyses"},
        {"id": "defense", "label": "Round 3: Defense"},
        {"id": "verdict", "label": "Round 5: Verdict"},
    ]
    edges = [
        {"from": "clarification", "to": "attacks"},
        {"from": "attacks", "to": "defense"},
        {"from": "defense", "to": "verdict"},
    ]
    mermaid = (
        "graph TD; clarification[Clarification]-->attacks[Attacks]; "
        "attacks-->defense[Defense]; defense-->verdict[Verdict];"
    )
    return {"nodes": nodes, "edges": edges, "mermaid": mermaid}


@router.get(
    "/debate/{debate_id}/graph",
    summary="Debate Graph Progress",
    description="Get progress across debate graph nodes",
    tags=["arena"],
)
async def get_debate_graph(
    debate_id: str,
    user: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """
    Return graph progress based on current_round.
    """
    state = await get_debate_state(debate_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Debate {debate_id} not found")
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")
    _enforce_state_owner(state, uid)
    current_round = int(state.get("current_round", 0))
    round_status = state.get("round_status", state.get("status", "pending"))

    validation_mode = state.get("validation_mode", "long")
    if validation_mode == "short":
        ordered_nodes = ["clarification", "verdict"]
        round_to_index = {1: 0, 2: 1}
    else:
        ordered_nodes = ["clarification", "attacks", "defense", "verdict"]
        # Map round numbers to nodes: 1->clarification, 2->attacks, 3->defense, 5->verdict
        round_to_index = {1: 0, 2: 1, 3: 2, 5: 3}
    idx = round_to_index.get(current_round, -1)
    completed_nodes = ordered_nodes[: max(0, idx)] if idx >= 0 else []
    pending_nodes = [n for n in ordered_nodes if n not in completed_nodes]

    return {
        "debate_id": debate_id,
        "current_round": current_round,
        "round_status": round_status,
        "completed_nodes": completed_nodes,
        "pending_nodes": pending_nodes,
    }


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
async def validate_idea(
    request: IdeaValidationRequest,
    user: Dict[str, Any] = Depends(require_auth),
) -> IdeaValidationResponse:
    """
    Submit idea for validation.

    Args:
        request: Idea validation request containing PRD text

    Returns:
        IdeaValidationResponse: Response containing debate ID
    """
    try:
        uid = user.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Missing uid in token")

        if request.mode == "short":
            line_count = len([line for line in request.prd_text.splitlines() if line.strip()])
            if line_count < SHORT_MODE_MIN_LINES or line_count > SHORT_MODE_MAX_LINES:
                raise HTTPException(
                    status_code=400,
                    detail="Short mode requires 2–5 non-empty lines.",
                )
            if len(request.prd_text) > SHORT_MODE_MAX_CHARS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Short mode is limited to {SHORT_MODE_MAX_CHARS} characters.",
                )
            try:
                await anyio.to_thread.run_sync(_enforce_quick_roast_limit, user)
            except QuickRoastLimitError as exc:
                raise HTTPException(status_code=429, detail=str(exc)) from exc

        credit_cost = VALIDATION_CREDIT_COSTS[request.mode]
        try:
            if credit_cost > 0:
                await anyio.to_thread.run_sync(consume_credits, uid, credit_cost)
        except InsufficientCreditsError as exc:
            raise HTTPException(status_code=402, detail="Insufficient credits") from exc
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        # Generate unique debate ID
        debate_id = str(uuid.uuid4())

        # Create initial debate state
        idea_title = _extract_idea_title(request.prd_text)
        initial_state: Dict[str, Any] = {
            "debate_id": debate_id,
            "user_id": uid,
            "validation_mode": request.mode,
            "status": "pending",
            "current_round": 0,
            "round_status": "pending",
            "transcript": [],
            "started_at": datetime.utcnow().isoformat(),
            "requested_domain": request.domain,
            "idea_text": request.prd_text,
        }

        # Save initial state without blocking on LLM extraction so the request returns fast
        initial_state["idea_title"] = idea_title
        saved = await save_debate_state(debate_id, initial_state)
        if not saved:
            if credit_cost > 0:
                await anyio.to_thread.run_sync(grant_credits, uid, credit_cost)
            raise HTTPException(status_code=500, detail="Failed to create debate state")

        # Persist a pending verdict document so clients can list active validations immediately
        now = datetime.utcnow()
        db = await anyio.to_thread.run_sync(get_firestore_client)
        doc_ref = db.collection("verdicts").document(debate_id)
        existing_snapshot = await anyio.to_thread.run_sync(doc_ref.get)
        existing_data = existing_snapshot.to_dict() if existing_snapshot.exists else {}
        record = _build_firestore_record(
            debate_id=debate_id,
            uid=uid,
            status="pending",
            idea_title=existing_data.get("idea_title")
            or existing_data.get("ideaTitle")
            or idea_title,
            verdict=existing_data.get("verdict"),
            created_at=now,
            existing_created_at=existing_data.get("created_at") or existing_data.get("createdAt"),
        )
        await anyio.to_thread.run_sync(lambda: doc_ref.set(record, merge=True))

        # Start background debate execution (non-blocking)
        asyncio.create_task(execute_debate(debate_id, request.prd_text, request.mode))

        return IdeaValidationResponse(
            debate_id=debate_id,
            message="Debate session created successfully.",
            idea_title=idea_title,
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
    debate_id: str = Path(..., description="Unique debate identifier"),
    user: Dict[str, Any] = Depends(require_auth),
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
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")
    _enforce_state_owner(state_dict, uid)

    # Transform raw transcript into chat-like format
    raw_transcript = state_dict.get("transcript", [])
    chat_transcript = _format_transcript_for_chat(raw_transcript)

    return DebateResponse(
        debate_id=debate_id,
        status=state_dict.get("status", "pending"),
        current_round=state_dict.get("current_round", 0),
        round_status=state_dict.get("round_status", state_dict.get("status", "pending")),
        idea_title=state_dict.get("idea_title", "Untitled Idea"),
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
    max_bullets = 200

    def strip_code_fences(text: str) -> str:
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    def parse_json_payload(text: str) -> Dict[str, Any] | None:
        raw = text.strip()
        if "```json" in raw:
            start = raw.find("```json") + len("```json")
            end = raw.find("```", start)
            if end != -1:
                raw = raw[start:end].strip()
        elif "```" in raw:
            start = raw.find("```") + len("```")
            end = raw.find("```", start)
            if end != -1:
                raw = raw[start:end].strip()
        else:
            brace_start = raw.find("{")
            brace_end = raw.rfind("}")
            if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
                raw = raw[brace_start : brace_end + 1].strip()
        try:
            return json.loads(strip_code_fences(raw))
        except Exception:
            return None

    def bullets(items: list[str]) -> str:
        trimmed = [item.strip() for item in items if item and item.strip()]
        return "\n".join([f"• {item}" for item in trimmed[:max_bullets]]) or "• —"

    def bullets_from_text(text: str) -> str:
        lines = []
        for line in text.splitlines():
            if line.strip().startswith("•"):
                lines.append(line.strip().lstrip("•").strip())
        return bullets(lines)

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
            parsed = parse_json_payload(raw_text)
            if parsed:
                questions = parsed.get("clarification_questions", [])
                gaps = parsed.get("identified_gaps", [])
                quality = parsed.get("quality_score", 0)

                question_summary = bullets(questions)
                gap_summary = bullets(gaps)
                message = (
                    f"**Judge's Analysis:**\n\nKey Questions:\n{question_summary}\n\n"
                    f"Key Gaps Identified:\n{gap_summary}\n\nQuality Score: {quality}/1.0"
                )
            else:
                quality_score = entry.get("summary", {}).get("quality_score", "N/A")
                message = f"Judge analyzed the idea (Quality: {quality_score}/1.0)"

        elif entry_type == "round2:start":
            message = "Worker agents (Skeptic, Customer, Market) are analyzing..."

        elif entry_type == "attack":
            # Skeptic attack
            parsed = parse_json_payload(raw_text)
            if parsed:
                attacks = parsed.get("fatal_flaws", []) or parsed.get("attack_points", [])
                message = "**Skeptic's Attack:**\n\n" + bullets(attacks)
            else:
                message = raw_text.strip() or "Skeptic provided attack analysis"

        elif entry_type == "customer":
            parsed = parse_json_payload(raw_text)
            if parsed:
                problem = parsed.get("problem_validation", {})
                willingness = parsed.get("willingness_to_pay", {})
                alternatives = parsed.get("alternatives", [])
                segments = parsed.get("customer_segments", [])
                concerns = parsed.get("critical_concerns", [])

                alt_summary = [
                    (
                        f"{a.get('alternative')}: {a.get('why_used')} "
                        f"(Barrier: {a.get('switching_barrier')})"
                    )
                    for a in alternatives
                    if isinstance(a, dict)
                ]
                segment_summary = [
                    (
                        f"{s.get('segment')} ({s.get('adoption_likelihood')}): "
                        f"{s.get('reasoning')}"
                    )
                    for s in segments
                    if isinstance(s, dict)
                ]
                bullet_lines = [
                    (
                        f"Problem exists: {problem.get('problem_exists')} "
                        f"(Pain {problem.get('pain_level')})"
                    ),
                    (
                        f"Willing to pay: {willingness.get('will_pay')} "
                        f"({willingness.get('estimated_price')})"
                    ),
                    *(alt_summary[:2]),
                    *(segment_summary[:2]),
                    *(concerns[:2]),
                ]
                message = "**Customer Insights:**\n\n" + bullets(bullet_lines)
            else:
                message = "**Customer Insights:**\n\n" + bullets_from_text(raw_text)

        elif entry_type == "market":
            parsed = parse_json_payload(raw_text)
            if parsed:
                market = parsed.get("market_analysis", {})
                saturation = parsed.get("market_saturation", {})
                competition = parsed.get("competition", [])
                barriers = parsed.get("barriers_to_entry", [])
                advantage = parsed.get("competitive_advantage", {})
                risks = parsed.get("market_risks", [])

                competition_summary = [
                    f"{c.get('competitor')} ({c.get('type')}): {c.get('strength')}"
                    for c in competition
                    if isinstance(c, dict)
                ]
                bullet_lines = [
                    (
                        f"Market size realistic: {market.get('market_size_realistic')} "
                        f"({market.get('market_growth')})"
                    ),
                    (
                        f"Saturation: {saturation.get('is_saturated')} "
                        f"({saturation.get('saturation_level')})"
                    ),
                    *(competition_summary[:2]),
                    *(barriers[:1]),
                    (
                        f"Advantage: {advantage.get('has_advantage')} "
                        f"({advantage.get('advantage_type')})"
                    ),
                    *(risks[:1]),
                ]
                message = "**Market Analysis:**\n\n" + bullets(bullet_lines)
            else:
                message = "**Market Analysis:**\n\n" + bullets_from_text(raw_text)

        elif entry_type == "defense:start":
            message = "Builder is preparing defense..."

        elif entry_type == "defense":
            parsed = parse_json_payload(raw_text)
            if parsed:
                feasibility = parsed.get("feasibility_analysis", {})
                defense = parsed.get("defense", {})
                defense_points = defense.get("defense_points", [])
                strengths = defense.get("strengths", []) or parsed.get(
                    "constrained_defense_points", []
                )
                risks = parsed.get("risks", [])

                defense_summary = [
                    (f"{p.get('point')} " f"(Facts: {', '.join(p.get('supporting_facts', []))})")
                    for p in defense_points
                    if isinstance(p, dict)
                ]
                risks_summary = [
                    f"{r.get('risk')} ({r.get('severity')}): {r.get('mitigation')}"
                    for r in risks
                    if isinstance(r, dict)
                ]
                bullet_lines = [
                    (
                        f"Feasibility: {feasibility.get('technical_feasibility')} technical / "
                        f"{feasibility.get('business_feasibility')} business"
                    ),
                    *(defense_summary[:2]),
                    *(strengths[:2]),
                    *(risks_summary[:1]),
                ]
                message = "**Builder's Defense:**\n\n" + bullets(bullet_lines)
            else:
                message = "**Builder's Defense:**\n\n" + bullets_from_text(raw_text)
        elif entry_type == "cross_exam:start":
            message = "Cross-examination round: agents challenge each other's claims."

        elif entry_type == "cross_exam":
            parsed = parse_json_payload(raw_text)
            if parsed:
                challenges = parsed.get("challenges", [])
                challenge_lines = [
                    f"{c.get('target_agent')}: {c.get('target_claim')} ({c.get('severity')})"
                    for c in challenges
                    if isinstance(c, dict)
                ]
                message = "**Cross-Examination:**\n\n" + bullets(challenge_lines)
            else:
                message = raw_text.strip() or "Cross-examination delivered challenges"

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
            message = raw_text

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
    debate_id: str = Path(..., description="Unique debate identifier"),
    user: Dict[str, Any] = Depends(require_auth),
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
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")
    _enforce_state_owner(state_dict, uid)

    status = state_dict.get("status", state_dict.get("round_status", "pending"))
    verdict_dict = state_dict.get("verdict")

    idea_title = state_dict.get("idea_title") or state_dict.get("ideaTitle") or "Untitled Idea"
    started_at = _serialize_timestamp(state_dict.get("started_at"))
    last_updated = _serialize_timestamp(state_dict.get("last_updated"))

    if not idea_title or idea_title.strip().lower() == "untitled idea":
        db = await anyio.to_thread.run_sync(get_firestore_client)
        verdict_doc = await anyio.to_thread.run_sync(
            db.collection("verdicts").document(debate_id).get
        )
        if verdict_doc.exists:
            verdict_data = verdict_doc.to_dict() or {}
            stored_title = verdict_data.get("idea_title") or verdict_data.get("ideaTitle")
            if stored_title:
                idea_title = stored_title

    if status != "completed" or not verdict_dict:
        return VerdictResponse(
            debate_id=debate_id,
            verdict=None,
            status=status,
            message="Debate is still in progress or not completed yet.",
            idea_title=idea_title,
            started_at=started_at,
            last_updated=last_updated,
        )

    # Convert verdict dict to Verdict model
    try:
        verdict = Verdict(**verdict_dict)
        return VerdictResponse(
            debate_id=debate_id,
            verdict=verdict,
            status="completed",
            message="Verdict available",
            idea_title=idea_title,
            started_at=started_at,
            last_updated=last_updated,
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
    # Note: delete_debate_state not yet implemented
    raise HTTPException(status_code=501, detail="Delete debate state not yet implemented")


async def execute_debate(debate_id: str, prd_text: str, mode: str = "long") -> None:
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
                "current_round": event.get("round", state.get("current_round", 0)),
                "round_status": "in_progress",
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

        # Extract PRD structure (reuse if available)
        pre_state = await get_debate_state(debate_id) or {}
        extracted_data = pre_state.get("extracted_structure")
        if extracted_data:
            sections = [
                Section(
                    title=s.get("title", "Untitled"),
                    content=s.get("content", ""),
                    category=s.get("category", "other"),
                    key_points=s.get("key_points", []),
                )
                for s in extracted_data.get("sections", [])
            ]
            extracted_structure = ExtractedStructure(
                sections=sections,
                key_facts=extracted_data.get("key_facts", {}),
                lists=extracted_data.get("lists", {}),
                metadata=extracted_data.get("metadata", {}),
            )
            idea = Idea(original_prd_text=prd_text, extracted_structure=extracted_structure)
        else:
            idea = await extract_idea_from_prd(prd_text, debate_id=debate_id)

        # Update state with idea title
        state = await get_debate_state(debate_id) or {}
        idea_title = idea.extracted_structure.metadata.get("title", "Untitled Idea")
        state["idea_title"] = idea_title
        state["requested_domain"] = pre_state.get("requested_domain")
        state["idea_text"] = idea.original_prd_text
        state["extracted_structure"] = idea.extracted_structure.model_dump()
        await save_debate_state(debate_id, state)

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

        if mode == "short":
            await append_event(
                {
                    "agent": "Judge",
                    "round": 2,
                    "type": "verdict:start",
                    "text": "⚖️ Weighing the brief and generating a fast verdict...",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )
            verdict = await judge.generate_verdict(
                idea=idea,
                clarification=clarification.get("raw_response", ""),
                attacks={},
                defense="",
                cross_examination=[],
                evidence_tags=[],
            )

            await append_event(
                {
                    "agent": "Judge",
                    "round": 2,
                    "type": "verdict",
                    "text": (
                        verdict.get("raw_response", "")
                        if isinstance(verdict, dict)
                        else getattr(verdict, "raw_response", "")
                    ),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

            final_state = await get_debate_state(debate_id) or {}
            final_state.update(
                {
                    "status": "completed",
                    "round_status": "completed",
                    "verdict": verdict.model_dump() if hasattr(verdict, "model_dump") else verdict,
                    "last_updated": datetime.utcnow().isoformat(),
                }
            )
            await save_debate_state(debate_id, final_state)
            return

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

        # Phase 2: Retrieve similar past ideas for historical context
        historical_context_text = ""
        historical_precedents: list[dict[str, Any]] = []
        try:
            historical_store = get_historical_store()
            if historical_store.enabled:
                # Generate idea embedding for semantic search
                idea_summary = prd_text[:500]  # First 500 chars as summary
                embeddings = await embed_texts([idea_summary])
                idea_embedding = embeddings[0]

                # Detect domain from extracted structure
                requested_domain = pre_state.get("requested_domain")
                idea_domain = detect_idea_domain(
                    extracted_structure,
                    explicit_domain=requested_domain,
                    debate_id=debate_id,
                )

                # Persist detected domain for downstream use
                state = await get_debate_state(debate_id) or {}
                state["idea_domain"] = idea_domain
                await save_debate_state(debate_id, state)

                # Retrieve semantically similar past verdicts
                similar_ideas = await historical_store.retrieve_similar_ideas(
                    query_embedding=idea_embedding,
                    n_results=5,
                    domain_filter=idea_domain if idea_domain != "general" else None,
                    idea_text=idea_summary,
                )

                historical_precedents = similar_ideas
                if state is not None:
                    state["historical_precedents"] = historical_precedents
                    await save_debate_state(debate_id, state)

                if similar_ideas:
                    # Format historical context for agents
                    historical_context_text = (
                        "\n## Historical Pattern Analysis (cross-domain insights):\n"
                    )
                    for i, past_idea in enumerate(similar_ideas, 1):
                        # Show domain diversity
                        domain_label = f"{past_idea.get('domain', 'General')} domain"
                        confidence_pct = f"{past_idea.get('confidence', 0.5):.1%}"
                        historical_context_text += (
                            f"\n**Pattern {i}** ({domain_label}, "
                            f"Confidence: {confidence_pct}):\n"
                        )
                        verdict_str = past_idea.get("verdict_decision")
                        score = past_idea.get("overall_score", "N/A")
                        historical_context_text += (
                            f"- Verdict: **{verdict_str}** (Score: {score}/100)\n"
                        )
                        kill_shot_titles = [
                            ks.get("title", "Unknown") for ks in past_idea.get("kill_shots", [])
                        ]
                        flaws = ", ".join(kill_shot_titles)
                        historical_context_text += f"- Critical Flaws: {flaws}\n"
                        if past_idea.get("recommendations"):
                            recs = ", ".join(past_idea.get("recommendations", [])[:2])
                            historical_context_text += f"- Proven Fixes: {recs}\n"

                    await append_event(
                        {
                            "agent": "System",
                            "round": 2,
                            "type": "historical_context",
                            "text": (
                                f"Retrieved {len(similar_ideas)} cross-domain patterns. "
                                f"Agents will challenge against these."
                            ),
                            "metadata": {
                                "precedent_ids": [p.get("id") for p in similar_ideas],
                                "idea_domain": idea_domain,
                            },
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    )
        except Exception:
            # Silently skip historical retrieval if it fails
            pass

        # Skeptic attack
        await append_event(
            {
                "agent": "Skeptic",
                "round": 2,
                "type": "attack:start",
                "text": (
                    "🔍 Analyzing fatal flaws, market risks, and "
                    "business model vulnerabilities..."
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        skeptic_result = await skeptic.attack_idea(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            previous_context=clarification,
            historical_context=historical_context_text,
        )
        _, skeptic_metadata = format_agent_response(skeptic_result, "Skeptic")
        await append_event(
            {
                "agent": "Skeptic",
                "round": 2,
                "type": "attack",
                "text": skeptic_result.get("raw_response", ""),
                "metadata": skeptic_metadata,
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
            historical_context=historical_context_text,
        )
        _, customer_metadata = format_agent_response(customer_result, "Customer")
        await append_event(
            {
                "agent": "Customer",
                "round": 2,
                "type": "customer",
                "text": customer_result.get("raw_response", ""),
                "metadata": customer_metadata,
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
        grounding_query = _build_grounding_query(idea, extracted_structure)
        grounded_sources = search_google(grounding_query)
        market_result = await market.analyze_market(
            idea_text=idea.original_prd_text,
            extracted_structure=extracted_structure,
            previous_context=clarification,
            historical_context=historical_context_text,
            grounded_sources=grounded_sources,
        )
        _, market_metadata = format_agent_response(market_result, "Market")
        await append_event(
            {
                "agent": "Market",
                "round": 2,
                "type": "market",
                "text": market_result.get("raw_response", ""),
                "metadata": market_metadata,
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
        state = await get_debate_state(debate_id) or {}
        state["evidence_tags"] = _dump_evidence_tags(round2_evidence)
        await save_debate_state(debate_id, state)

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
            historical_context=historical_context_text,
        )
        _, defense_metadata = format_agent_response(defense_result, "Builder")
        await append_event(
            {
                "agent": "Builder",
                "round": 3,
                "type": "defense",
                "text": defense_result.get("raw_response", ""),
                "metadata": defense_metadata,
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

        # Round 4: Cross-examination
        await append_event(
            {
                "agent": "System",
                "round": 4,
                "type": "cross_exam:start",
                "text": "Cross-examination: agents challenge each other's claims...",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        cross_exam_roles = [
            {
                "name": "Skeptic",
                "perspective": "Push hardest on logical gaps, hype, and fatal flaws.",
            },
            {
                "name": "Customer",
                "perspective": (
                    "Challenge claims that ignore real user behavior or willingness to pay."
                ),
            },
            {
                "name": "Market",
                "perspective": "Challenge market sizing, competition, and differentiation claims.",
            },
            {
                "name": "Builder",
                "perspective": (
                    "Challenge feasibility critiques with concrete constraints and facts."
                ),
            },
        ]

        cross_examination: list[dict[str, Any]] = []
        cross_exam_evidence = []
        attacks_payload = {
            "skeptic": skeptic_result.get("response"),
            "customer": customer_result.get("response"),
            "market": market_result.get("response"),
        }
        defense_payload = defense_result.get("response")

        for role in cross_exam_roles:
            other_claims = {
                "attacks": attacks_payload,
                "defense": defense_payload,
            }
            cross_exam_agent = CrossExamAgent(
                name=role["name"],
                perspective=role["perspective"],
                debate_id=debate_id,
            )
            cross_exam_result = await cross_exam_agent.cross_examine(
                idea_text=idea.original_prd_text,
                clarification=clarification.get("raw_response", ""),
                attacks=attacks_payload,
                defense=defense_payload,
                other_claims=other_claims,
            )
            cross_examination.append(
                {
                    "agent": role["name"],
                    "response": cross_exam_result.get("response"),
                }
            )
            cross_exam_evidence.extend(cross_exam_result.get("evidence_tags", []))
            await append_event(
                {
                    "agent": role["name"],
                    "round": 4,
                    "type": "cross_exam",
                    "text": cross_exam_result.get("raw_response", ""),
                    "metadata": {
                        "agent": role["name"],
                        "evidence_count": len(cross_exam_result.get("evidence_tags", [])),
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
        all_evidence_tags = (
            round2_evidence + defense_result.get("evidence_tags", []) + cross_exam_evidence
        )
        state = await get_debate_state(debate_id) or {}
        state["evidence_tags"] = _dump_evidence_tags(all_evidence_tags)
        await save_debate_state(debate_id, state)
        verdict = await judge.generate_verdict(
            idea=idea,
            clarification=clarification.get("raw_response", ""),
            attacks=attacks,
            defense=defense_result.get("response", ""),
            cross_examination=cross_examination,
            evidence_tags=all_evidence_tags,
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
                "round_status": "completed",
                "verdict": verdict.model_dump() if hasattr(verdict, "model_dump") else verdict,
                "last_updated": datetime.utcnow().isoformat(),
            }
        )
        await save_debate_state(debate_id, final_state)

        # Phase 2: Persist decision evidence for historical analysis
        try:
            historical_store = get_historical_store()
            if historical_store.enabled:
                verdict_obj = verdict if isinstance(verdict, Verdict) else Verdict(**verdict)

                # Generate idea embedding for persistence
                idea_summary = prd_text[:500]
                embeddings = await embed_texts([idea_summary])
                idea_embedding = embeddings[0]

                # Extract kill-shot titles and severity
                kill_shots_for_storage = [
                    {
                        "title": ks.title,
                        "severity": ks.severity,
                        "description": ks.description,
                    }
                    for ks in verdict_obj.kill_shots[:3]
                ]

                # Detect domain from extracted structure
                state = await get_debate_state(debate_id) or {}
                idea_domain = detect_idea_domain(
                    extracted_structure,
                    explicit_domain=state.get("requested_domain"),
                    debate_id=debate_id,
                )

                # Create decision evidence
                decision_evidence = DecisionEvidence(
                    debate_id=debate_id,
                    source_debate_id=debate_id,
                    idea_summary=idea_summary,
                    idea_embedding=idea_embedding,
                    verdict_decision=verdict_obj.decision,
                    overall_score=verdict_obj.scorecard.overall_score,
                    kill_shots=kill_shots_for_storage,
                    assumptions=verdict_obj.assumptions,
                    recommendations=verdict_obj.recommendations,
                    domain=idea_domain,
                    confidence=verdict_obj.confidence,
                )

                # Persist to historical store
                stored_id = await historical_store.persist_decision_evidence(decision_evidence)
                if stored_id:
                    print(f"Decision evidence persisted for debate {debate_id}")
        except Exception as e:
            # Silently skip persistence if it fails
            print(f"Warning: Failed to persist decision evidence: {e}")

    except Exception as e:
        # Capture failure in state
        fail_state = await get_debate_state(debate_id) or {}
        fail_state.update(
            {
                "status": "failed",
                "round_status": "failed",
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
