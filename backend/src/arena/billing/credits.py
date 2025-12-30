"""Credit management helpers."""

from typing import Any, Dict, Optional

from arena.auth.firebase import get_firestore_client
from firebase_admin import firestore


class InsufficientCreditsError(RuntimeError):
    """Raised when a user has insufficient credits."""


def _get_current_credits(data: Dict[str, Any]) -> int:
    try:
        return int(data.get("credits") or 0)
    except (TypeError, ValueError):
        return 0


def consume_credits(uid: str, amount: int = 1) -> int:
    """Atomically decrement credits; returns remaining credits."""

    if amount <= 0:
        return 0

    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _consume(transaction: firestore.Transaction) -> int:
        snapshot = user_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise ValueError("User not found")
        data = snapshot.to_dict() or {}
        current = _get_current_credits(data)
        if current < amount:
            raise InsufficientCreditsError("Insufficient credits")
        remaining = current - amount
        transaction.update(user_ref, {"credits": remaining})
        return remaining

    return _consume(db.transaction())


def grant_credits(
    uid: str,
    amount: int,
    *,
    reason: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    """Atomically add credits; returns updated balance."""

    if amount <= 0:
        return 0

    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _grant(transaction: firestore.Transaction) -> int:
        snapshot = user_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise ValueError("User not found")
        data = snapshot.to_dict() or {}
        current = _get_current_credits(data)
        updated = current + amount
        transaction.update(user_ref, {"credits": updated})
        return updated

    updated = _grant(db.transaction())

    if reason or metadata:
        log_ref = db.collection("credit_transactions").document()
        log_ref.set(
            {
                "uid": uid,
                "amount": amount,
                "reason": reason,
                "metadata": metadata or {},
                "created_at": firestore.SERVER_TIMESTAMP,
            }
        )

    return updated
