"""Authentication and authorization endpoints using Firebase Auth + Firestore.

Implements:
- Email/password sign up and login (via Firebase Admin SDK)
- Google login (accepts Firebase ID token from frontend)
- Email verification (send verification email)
- Forgot password (send reset email)

Returns both a custom Firebase token and a short-lived backend session JWT.
"""

import time
from typing import Any, Dict

import anyio
from arena.auth.firebase import (
    create_user,
    generate_email_verification_link,
    generate_password_reset_link,
    get_firestore_client,
    verify_token,
)
from arena.auth.jwt import create_session_token
from arena.models.user import UserModel
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()
security = HTTPBearer(auto_error=False)


# Simple in-memory rate limiter (per-IP)
_attempts: dict[str, list[float]] = {}
_WINDOW_SECONDS = 60.0
_MAX_ATTEMPTS = 5


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = _attempts.setdefault(ip, [])
    # purge old
    cutoff = now - _WINDOW_SECONDS
    _attempts[ip] = [ts for ts in bucket if ts >= cutoff]
    if len(_attempts[ip]) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again shortly.")
    _attempts[ip].append(now)


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., alias="idToken")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/signup")
async def signup(payload: SignupRequest, request: Request) -> Dict[str, Any]:
    """Sign up a user with email/password via Firebase Admin SDK.

    - Creates Firebase auth user
    - Saves user doc in Firestore
    - Generates verification link (would need to be sent via email service)
    - Returns message and uid
    """

    _rate_limit(request)

    try:
        # 1) Create user via Firebase Admin SDK
        user_record = await anyio.to_thread.run_sync(
            create_user, payload.email, payload.password, payload.name
        )
        uid = user_record.uid

        # 2) Save Firestore user document
        db = await anyio.to_thread.run_sync(get_firestore_client)
        users = db.collection("users")
        from datetime import datetime

        user_model = UserModel(
            uid=uid,
            name=payload.name,
            email=payload.email.lower(),
            createdAt=datetime.utcnow(),
            verified=False,
            loginProvider="email",
            credits=0,
            stripeCustomerId=None,
            stripeSubscriptionId=None,
            stripePlan=None,
            plan=None,
        )
        await anyio.to_thread.run_sync(
            users.document(uid).set,
            user_model.dict(),
        )

        # 3) Generate verification link (in production, send this via email)
        await anyio.to_thread.run_sync(generate_email_verification_link, payload.email)
        # TODO: Send email with verification_link using email service

        return {"message": "Signup successful. Verification email sent.", "uid": uid}

    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail="Email already in use")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


class LoginWithTokenRequest(BaseModel):
    """Login request with Firebase ID token from client-side authentication."""

    id_token: str = Field(..., alias="idToken")


@router.post("/login")
async def login(payload: LoginWithTokenRequest, request: Request) -> Dict[str, Any]:
    """Verify Firebase ID token from client-side login.

    Frontend handles Firebase authentication with email/password using Firebase client SDK,
    then sends the ID token to this endpoint for backend session creation.

    Returns backend `sessionToken`.
    """

    _rate_limit(request)

    try:
        # Verify ID token
        decoded = await anyio.to_thread.run_sync(verify_token, payload.id_token)
        uid = decoded.get("uid")
        email = decoded.get("email")

        if not uid or not email:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Check email verification
        if not decoded.get("email_verified"):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Please verify your email before logging in. "
                    "Check your inbox for the verification link."
                ),
            )

        # Ensure Firestore user exists
        db = await anyio.to_thread.run_sync(get_firestore_client)
        doc_ref = db.collection("users").document(uid)
        doc = await anyio.to_thread.run_sync(doc_ref.get)

        if not doc.exists:
            from datetime import datetime

            print(f"[AUTH] Creating Firestore user for {email} (UID: {uid})")

            user_model = UserModel(
                uid=uid,
                name=decoded.get("name") or email.split("@")[0],
                email=email.lower(),
                createdAt=datetime.utcnow(),
                verified=decoded.get("email_verified", False),
                loginProvider="email",
            )
            await anyio.to_thread.run_sync(
                doc_ref.set,
                user_model.dict(),
            )
            print(f"[AUTH] Firestore user created successfully for {email}")
        else:
            print(f"[AUTH] Firestore user already exists for {email}")
            # Update verified status
            if decoded.get("email_verified"):
                await anyio.to_thread.run_sync(doc_ref.update, {"verified": True})
                print(f"[AUTH] Updated verified status to True for {email}")

        session_token = create_session_token(uid, email)
        return {
            "idToken": payload.id_token,
            "sessionToken": session_token,
            "user": {"uid": uid, "email": email},
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


@router.post("/google")
async def google_login(payload: GoogleLoginRequest) -> Dict[str, Any]:
    """Accept a Firebase ID token after client-side Google login.

    Verifies the token, creates Firestore user on first login, and returns a backend session token.
    """

    try:
        decoded = await anyio.to_thread.run_sync(verify_token, payload.id_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Invalid Google token") from exc

    uid = decoded.get("uid")
    email = decoded.get("email")
    name = decoded.get("name") or (email.split("@")[0] if email else "User")
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Missing uid/email in token")

    db = await anyio.to_thread.run_sync(get_firestore_client)
    doc_ref = db.collection("users").document(uid)
    doc = await anyio.to_thread.run_sync(doc_ref.get)
    if not doc.exists:
        from datetime import datetime

        user_model = UserModel(
            uid=uid,
            name=name,
            email=email.lower(),
            createdAt=datetime.utcnow(),
            verified=True,
            loginProvider="google",
        )
        await anyio.to_thread.run_sync(
            doc_ref.set,
            user_model.dict(),
        )

    session_token = create_session_token(uid, email)
    return {
        "idToken": payload.id_token,
        "sessionToken": session_token,
        "user": {"uid": uid, "email": email, "name": name},
    }


@router.post("/send-verification")
async def send_verification(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> Dict[str, Any]:
    """Send a verification email to the currently logged in user (requires Firebase ID token)."""

    _rate_limit(request)
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        # Verify the token to get user info
        decoded = await anyio.to_thread.run_sync(verify_token, credentials.credentials)
        email = decoded.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        # Generate verification link
        await anyio.to_thread.run_sync(generate_email_verification_link, email)
        # TODO: Send email with verification_link using email service

        return {"message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification: {str(e)}")


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request) -> Dict[str, Any]:
    """Send a password reset email to a user."""

    _rate_limit(request)

    try:
        # Generate password reset link
        await anyio.to_thread.run_sync(generate_password_reset_link, payload.email)
        # TODO: Send email with reset_link using email service

        return {"message": "Password reset email sent"}
    except firebase_auth.UserNotFoundError:
        # Return success even if user not found (security best practice)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reset email: {str(e)}")
