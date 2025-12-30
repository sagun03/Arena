"""Firebase Admin initialization and helpers."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

import firebase_admin
from arena.config.settings import settings
from firebase_admin import auth, credentials, firestore


@lru_cache(maxsize=1)
def get_firebase_app() -> firebase_admin.App:
    """Initialize or return the cached Firebase app using a service account."""

    base_dir = Path(__file__).resolve().parents[3]
    cred_path = Path(settings.firebase_service_account_path)
    if not cred_path.is_absolute():
        cred_path = base_dir / cred_path

    if not cred_path.exists():
        raise FileNotFoundError(f"Firebase service account not found at: {cred_path}")

    cred = credentials.Certificate(str(cred_path))
    options: Dict[str, Any] = {}
    if settings.firebase_project_id:
        options["projectId"] = settings.firebase_project_id

    app = firebase_admin.initialize_app(cred, options or None)
    return app


def verify_token(id_token: str) -> Dict[str, Any]:
    """Verify a Firebase ID token and return the decoded claims."""

    app = get_firebase_app()
    return auth.verify_id_token(id_token, app=app)


def get_firestore_client() -> firestore.Client:
    """Return a Firestore client bound to the Firebase app."""

    app = get_firebase_app()
    return firestore.client(app=app)


def create_user(email: str, password: str, display_name: str | None = None) -> auth.UserRecord:
    """Create a new Firebase user with email/password using Admin SDK."""

    app = get_firebase_app()
    return auth.create_user(
        email=email, password=password, display_name=display_name, email_verified=False, app=app
    )


def get_user_by_email(email: str) -> auth.UserRecord:
    """Get a Firebase user by email."""

    app = get_firebase_app()
    return auth.get_user_by_email(email, app=app)


def create_custom_token(uid: str) -> str:
    """Create a custom Firebase token for a user."""

    app = get_firebase_app()
    token = auth.create_custom_token(uid, app=app)
    return token.decode("utf-8") if isinstance(token, bytes) else token


def generate_email_verification_link(email: str) -> str:
    """Generate an email verification link."""

    app = get_firebase_app()
    return auth.generate_email_verification_link(email, app=app)


def generate_password_reset_link(email: str) -> str:
    """Generate a password reset link."""

    app = get_firebase_app()
    return auth.generate_password_reset_link(email, app=app)
