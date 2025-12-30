"""Shared auth dependencies for FastAPI routers."""

from typing import Any, Dict

import anyio
from arena.auth.firebase import verify_token
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> Dict[str, Any]:
    """Require a verified Firebase ID token from the Authorization header."""

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        decoded = await anyio.to_thread.run_sync(verify_token, credentials.credentials)
        if not decoded.get("email_verified"):
            raise HTTPException(status_code=403, detail="Email not verified")
        return decoded
    except Exception as exc:  # noqa: BLE001
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
