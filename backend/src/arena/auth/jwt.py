"""Simple JWT helpers for backend session tokens."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from arena.config.settings import settings


def create_session_token(uid: str, email: str) -> str:
    """Create a short-lived JWT session token signed with HS256."""

    if not settings.jwt_secret:
        raise RuntimeError("JWT secret is not configured")

    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_exp_minutes)
    payload: Dict[str, Any] = {
        "sub": uid,
        "email": email,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_session_token(token: str) -> Dict[str, Any]:
    """Verify and decode a session token."""

    if not settings.jwt_secret:
        raise RuntimeError("JWT secret is not configured")

    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
    )  # type: ignore[no-any-return]
