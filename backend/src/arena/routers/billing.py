"""Stripe billing and credit purchase endpoints."""

from typing import Any, Dict

import anyio
import stripe
from arena.auth.dependencies import require_auth
from arena.auth.firebase import get_firestore_client
from arena.billing.credits import grant_credits
from arena.config.settings import settings
from fastapi import APIRouter, Depends, HTTPException, Request
from firebase_admin import firestore
from pydantic import BaseModel, Field

router = APIRouter()


class CheckoutSessionRequest(BaseModel):
    pack_id: str = Field(..., description="Credit pack identifier")


class CheckoutSessionResponse(BaseModel):
    url: str = Field(..., description="Stripe Checkout session URL")


class CreditsResponse(BaseModel):
    credits: int = Field(..., description="Current credit balance")


def _get_pack_config() -> Dict[str, Dict[str, Any]]:
    return {
        "starter": {
            "price_id": settings.stripe_price_starter,
            "credits": 10,
        },
        "plus": {
            "price_id": settings.stripe_price_plus,
            "credits": 20,
        },
        "pro": {
            "price_id": settings.stripe_price_pro,
            "credits": 50,
        },
    }


def _get_pack(pack_id: str) -> Dict[str, Any]:
    packs = _get_pack_config()
    pack = packs.get(pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Unknown credit pack")
    if not pack.get("price_id"):
        raise HTTPException(status_code=500, detail="Stripe price not configured for pack")
    return pack


def _ensure_stripe_customer(uid: str, email: str | None) -> str:
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = user_doc.to_dict() or {}
    customer_id = user_data.get("stripeCustomerId")
    if customer_id:
        return customer_id

    stripe.api_key = settings.stripe_secret_key
    customer = stripe.Customer.create(email=email, metadata={"uid": uid})
    user_ref.update({"stripeCustomerId": customer.id})
    return customer.id


@router.post(
    "/checkout-session",
    response_model=CheckoutSessionResponse,
    summary="Create Stripe Checkout Session",
    tags=["billing"],
)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    user: Dict[str, Any] = Depends(require_auth),
) -> CheckoutSessionResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    pack = _get_pack(payload.pack_id)
    stripe.api_key = settings.stripe_secret_key

    customer_id = await anyio.to_thread.run_sync(_ensure_stripe_customer, uid, user.get("email"))

    session = await anyio.to_thread.run_sync(
        lambda: stripe.checkout.Session.create(
            mode="payment",
            customer=customer_id,
            line_items=[{"price": pack["price_id"], "quantity": 1}],
            success_url=settings.stripe_success_url,
            cancel_url=settings.stripe_cancel_url,
            client_reference_id=uid,
            metadata={
                "uid": uid,
                "pack_id": payload.pack_id,
                "credits": str(pack["credits"]),
            },
        )
    )

    return CheckoutSessionResponse(url=session.url)


@router.get(
    "/credits",
    response_model=CreditsResponse,
    summary="Get credit balance",
    tags=["billing"],
)
async def get_credits(user: Dict[str, Any] = Depends(require_auth)) -> CreditsResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    db = get_firestore_client()
    user_doc = await anyio.to_thread.run_sync(db.collection("users").document(uid).get)
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")
    data = user_doc.to_dict() or {}
    credits = int(data.get("credits") or 0)
    return CreditsResponse(credits=credits)


@router.post(
    "/webhook",
    summary="Stripe webhook",
    tags=["billing"],
)
async def stripe_webhook(request: Request) -> Dict[str, Any]:
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.stripe_webhook_secret,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") == "paid":
            metadata = session.get("metadata") or {}
            uid = metadata.get("uid")
            credits = metadata.get("credits")
            session_id = session.get("id")
            if uid and credits and session_id:
                db = get_firestore_client()
                session_ref = db.collection("stripe_sessions").document(session_id)
                session_snapshot = await anyio.to_thread.run_sync(session_ref.get)
                user_ref = db.collection("users").document(uid)
                amount_total = int(session.get("amount_total") or 0)
                currency = session.get("currency") or "usd"

                if not session_snapshot.exists:
                    await anyio.to_thread.run_sync(
                        session_ref.set,
                        {
                            "uid": uid,
                            "pack_id": metadata.get("pack_id"),
                            "amount_total": session.get("amount_total"),
                            "currency": session.get("currency"),
                            "created_at": firestore.SERVER_TIMESTAMP,
                            "credits_granted": False,
                        },
                    )

                session_snapshot = await anyio.to_thread.run_sync(session_ref.get)
                session_data = session_snapshot.to_dict() if session_snapshot.exists else {}
                if session_data.get("credits_granted"):
                    return {"status": "ok"}
                await anyio.to_thread.run_sync(
                    user_ref.update,
                    {
                        "lastPackId": metadata.get("pack_id"),
                        "lastPurchaseAt": firestore.SERVER_TIMESTAMP,
                        "lastPurchaseAmount": amount_total,
                        "lastPurchaseCurrency": currency,
                        "lifetimeSpend": firestore.Increment(amount_total),
                        "lifetimeCreditsPurchased": firestore.Increment(int(credits)),
                    },
                )
                await anyio.to_thread.run_sync(
                    lambda: grant_credits(
                        uid,
                        int(credits),
                        reason="stripe_checkout",
                        metadata={
                            "pack_id": metadata.get("pack_id"),
                            "session_id": session.get("id"),
                        },
                    )
                )
                await anyio.to_thread.run_sync(
                    session_ref.update,
                    {"credits_granted": True},
                )

    return {"status": "ok"}
