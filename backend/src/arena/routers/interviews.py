"""Interview panel endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

import anyio
from arena.agents.interview_agent import InterviewAgent
from arena.auth.dependencies import require_auth
from arena.auth.firebase import get_firestore_client
from arena.billing.credits import InsufficientCreditsError, consume_interview_credits
from arena.interviews.personas import PERSONAS
from arena.state_manager import get_debate_state
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(dependencies=[Depends(require_auth)])


class InterviewRequest(BaseModel):
    debate_id: str = Field(..., description="Debate ID to pull idea context")
    persona_id: str = Field(..., description="Persona ID")


class RebuttalRequest(BaseModel):
    debate_id: str = Field(..., description="Debate ID to pull idea context")
    persona_id: str = Field(..., description="Persona ID")
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[Dict[str, str]] = Field(default_factory=list)


@router.get("/interviews/personas")
async def list_personas() -> Dict[str, Any]:
    return {"personas": PERSONAS}


def _find_persona(persona_id: str) -> Dict[str, Any]:
    for persona in PERSONAS:
        if persona["id"] == persona_id:
            return persona
    raise HTTPException(status_code=404, detail="Persona not found")


def _get_state_owner_id(state: Dict[str, Any]) -> str | None:
    return state.get("user_id") or state.get("userId")


def _enforce_state_owner(state: Dict[str, Any], uid: str) -> None:
    owner = _get_state_owner_id(state)
    if not owner:
        raise HTTPException(status_code=403, detail="Debate ownership missing")
    if owner != uid:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/interviews/run")
async def run_interview(
    payload: InterviewRequest,
    decoded: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing user ID")

    try:
        await anyio.to_thread.run_sync(consume_interview_credits, uid, 1)
    except InsufficientCreditsError:
        raise HTTPException(status_code=402, detail="Interview pack required")

    state = await get_debate_state(payload.debate_id)
    if not state or not state.get("idea_text"):
        raise HTTPException(status_code=404, detail="Debate state not found")
    _enforce_state_owner(state, uid)

    persona = _find_persona(payload.persona_id)
    agent = InterviewAgent(debate_id=payload.debate_id)
    extracted_structure = state.get("extracted_structure") or {}
    result = await agent.run_interview(
        idea_text=state["idea_text"],
        persona=persona,
        extracted_structure=extracted_structure,
    )

    db = await anyio.to_thread.run_sync(get_firestore_client)
    doc_ref = db.collection("interviews").document()
    await anyio.to_thread.run_sync(
        doc_ref.set,
        {
            "debate_id": payload.debate_id,
            "uid": uid,
            "persona_id": payload.persona_id,
            "persona_name": persona["name"],
            "response": result.get("response", {}),
            "created_at": datetime.utcnow(),
        },
    )

    return {
        "persona": persona,
        "response": result.get("response", {}),
    }


@router.post("/interviews/rebuttal")
async def rebuttal_chat(
    payload: RebuttalRequest,
    decoded: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing user ID")

    state = await get_debate_state(payload.debate_id)
    if not state or not state.get("idea_text"):
        raise HTTPException(status_code=404, detail="Debate state not found")
    _enforce_state_owner(state, uid)

    persona = _find_persona(payload.persona_id)
    agent = InterviewAgent(debate_id=payload.debate_id)
    result = await agent.rebuttal_chat(
        idea_text=state["idea_text"],
        persona=persona,
        founder_message=payload.message,
        history=payload.history,
    )

    db = await anyio.to_thread.run_sync(get_firestore_client)
    doc_ref = db.collection("interview_chats").document()
    await anyio.to_thread.run_sync(
        doc_ref.set,
        {
            "debate_id": payload.debate_id,
            "uid": uid,
            "persona_id": payload.persona_id,
            "persona_name": persona["name"],
            "message": payload.message,
            "response": result.get("response", {}),
            "created_at": datetime.utcnow(),
        },
    )

    return {
        "persona": persona,
        "response": result.get("response", {}),
    }
