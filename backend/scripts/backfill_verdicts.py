"""Backfill verdict docs to snake_case fields and missing idea titles."""

from __future__ import annotations

from typing import Any, Dict, Optional

from arena.auth.firebase import get_firestore_client


def _pick_first(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if value:
            return value
    return None


def _needs_title(value: Optional[str]) -> bool:
    if not value:
        return True
    return value.strip().lower() == "untitled idea"


def _extract_idea_title_from_state(state: Dict[str, Any] | None) -> Optional[str]:
    if not state:
        return None
    return state.get("idea_title") or state.get("ideaTitle")


def main() -> None:
    db = get_firestore_client()
    verdicts_ref = db.collection("verdicts")
    debate_states_ref = db.collection("debate_states")

    updated = 0
    scanned = 0

    for doc in verdicts_ref.stream():
        scanned += 1
        data = doc.to_dict() or {}
        updates: Dict[str, Any] = {}

        debate_id = _pick_first(data.get("debate_id"), data.get("debateId"), doc.id)
        user_id = _pick_first(data.get("user_id"), data.get("userId"))
        idea_title = _pick_first(data.get("idea_title"), data.get("ideaTitle"))

        if data.get("debate_id") is None and debate_id:
            updates["debate_id"] = debate_id
        if data.get("user_id") is None and user_id:
            updates["user_id"] = user_id

        if data.get("created_at") is None and data.get("createdAt") is not None:
            updates["created_at"] = data.get("createdAt")
        if data.get("updated_at") is None and data.get("updatedAt") is not None:
            updates["updated_at"] = data.get("updatedAt")

        if data.get("kill_shots") is None and data.get("killShots") is not None:
            updates["kill_shots"] = data.get("killShots")
        if data.get("test_plan") is None and data.get("testPlan") is not None:
            updates["test_plan"] = data.get("testPlan")

        if _needs_title(idea_title):
            state_title = None
            if debate_id:
                state_doc = debate_states_ref.document(debate_id).get()
                if state_doc.exists:
                    state_title = _extract_idea_title_from_state(state_doc.to_dict() or {})
            if state_title:
                updates["idea_title"] = state_title
            elif idea_title:
                updates["idea_title"] = idea_title

        if updates:
            doc.reference.set(updates, merge=True)
            updated += 1

    print(f"Backfill complete. Scanned={scanned} Updated={updated}")


if __name__ == "__main__":
    main()
