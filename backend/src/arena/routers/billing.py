"""Stripe billing and credit purchase endpoints."""

import logging
from datetime import datetime
from typing import Any, Dict

import anyio
import stripe
from arena.auth.dependencies import require_auth
from arena.auth.firebase import get_firestore_client
from arena.billing.credits import grant_credits
from arena.config.settings import settings
from arena.models.user import UserModel
from fastapi import APIRouter, Depends, HTTPException, Request
from firebase_admin import firestore
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)


class CheckoutSessionRequest(BaseModel):
    pack_id: str = Field(..., description="Credit pack identifier")


class CheckoutSessionResponse(BaseModel):
    url: str = Field(..., description="Stripe Checkout session URL")


class CreditsResponse(BaseModel):
    credits: int = Field(..., description="Current credit balance")


class BillingStatusResponse(BaseModel):
    subscribed: bool = Field(..., description="Whether the user has an active subscription")
    subscription_id: str | None = Field(None, description="Stripe subscription id")
    subscription_pack_id: str | None = Field(None, description="Subscription pack id")


class PortalSessionResponse(BaseModel):
    url: str = Field(..., description="Stripe billing portal session URL")


def _get_pack_config() -> Dict[str, Dict[str, Any]]:
    return {
        "starter": {
            "price_id": settings.stripe_price_starter_usd,
            "credits": 12,
            "mode": "payment",
        },
        "pro_monthly": {
            "price_id": settings.stripe_price_pro_monthly_usd,
            "credits": 50,
            "mode": "subscription",
        },
        "growth_monthly": {
            "price_id": settings.stripe_price_growth_monthly_usd,
            "credits": 100,
            "mode": "subscription",
        },
        "scale_monthly": {
            "price_id": settings.stripe_price_scale_monthly_usd,
            "credits": 250,
            "mode": "subscription",
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


async def _ensure_user_doc(decoded: Dict[str, Any]) -> Dict[str, Any]:
    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid or not email:
        raise HTTPException(status_code=401, detail="Missing uid/email in token")

    db = get_firestore_client()
    doc_ref = db.collection("users").document(uid)
    doc = await anyio.to_thread.run_sync(doc_ref.get)
    if doc.exists:
        return doc.to_dict() or {}

    provider = (decoded.get("firebase") or {}).get("sign_in_provider")
    login_provider = "google" if provider == "google.com" else "email"
    user_model = UserModel(
        uid=uid,
        name=decoded.get("name") or email.split("@")[0],
        email=email.lower(),
        createdAt=datetime.utcnow(),
        verified=decoded.get("email_verified", False),
        loginProvider=login_provider,
        credits=5,
    )
    await anyio.to_thread.run_sync(doc_ref.set, user_model.dict())
    return user_model.dict()


def _get_subscription_credits(price_id: str) -> int | None:
    if not price_id:
        return None
    mapping = {
        settings.stripe_price_pro_monthly_usd: 50,
        settings.stripe_price_growth_monthly_usd: 100,
        settings.stripe_price_scale_monthly_usd: 250,
    }
    return mapping.get(price_id)


def _get_subscription_pack_id(price_id: str | None) -> str | None:
    if not price_id:
        return None
    mapping = {
        settings.stripe_price_pro_monthly_usd: "pro_monthly",
        settings.stripe_price_growth_monthly_usd: "growth_monthly",
        settings.stripe_price_scale_monthly_usd: "scale_monthly",
    }
    return mapping.get(price_id)


async def _resolve_subscription_price_id(
    invoice: Dict[str, Any], subscription_id: str | None
) -> str | None:
    lines = invoice.get("lines", {}).get("data", [])
    price_id = lines[0].get("price", {}).get("id") if lines else None
    if price_id:
        return price_id
    invoice_id = invoice.get("id")
    if invoice_id:
        expanded_invoice = await anyio.to_thread.run_sync(
            lambda: stripe.Invoice.retrieve(invoice_id, expand=["lines.data.price"])
        )
        expanded_lines = (expanded_invoice.get("lines") or {}).get("data", [])
        price_id = expanded_lines[0].get("price", {}).get("id") if expanded_lines else None
        if price_id:
            return price_id
    if subscription_id:
        subscription = await anyio.to_thread.run_sync(
            lambda: stripe.Subscription.retrieve(subscription_id, expand=["items.data.price"])
        )
        items = (subscription.get("items") or {}).get("data", [])
        if items:
            return items[0].get("price", {}).get("id")
    return None


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
            mode=pack["mode"],
            customer=customer_id,
            line_items=[{"price": pack["price_id"], "quantity": 1}],
            success_url=settings.stripe_success_url,
            cancel_url=settings.stripe_cancel_url,
            client_reference_id=uid,
            metadata={
                "uid": uid,
                "pack_id": payload.pack_id,
                "credits": str(pack["credits"]),
                "mode": pack["mode"],
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

    data = await _ensure_user_doc(user)
    credits = int(data.get("credits") or 0)
    return CreditsResponse(credits=credits)


@router.get(
    "/status",
    response_model=BillingStatusResponse,
    summary="Get subscription status",
    tags=["billing"],
)
async def get_billing_status(user: Dict[str, Any] = Depends(require_auth)) -> BillingStatusResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")

    data = await _ensure_user_doc(user)
    subscription_id = data.get("stripeSubscriptionId")
    plan_price_id = data.get("stripePlan")
    return BillingStatusResponse(
        subscribed=bool(subscription_id),
        subscription_id=subscription_id,
        subscription_pack_id=_get_subscription_pack_id(plan_price_id),
    )


@router.post(
    "/portal-session",
    response_model=PortalSessionResponse,
    summary="Create Stripe billing portal session",
    tags=["billing"],
)
async def create_portal_session(
    user: Dict[str, Any] = Depends(require_auth),
) -> PortalSessionResponse:
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Missing uid in token")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = settings.stripe_secret_key
    customer_id = await anyio.to_thread.run_sync(_ensure_stripe_customer, uid, user.get("email"))
    session = await anyio.to_thread.run_sync(
        lambda: stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=settings.stripe_portal_return_url,
        )
    )
    return PortalSessionResponse(url=session.url)


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
            if uid and session_id and metadata.get("mode") == "subscription":
                subscription_id = session.get("subscription")
                if subscription_id:
                    subscription = await anyio.to_thread.run_sync(
                        lambda: stripe.Subscription.retrieve(subscription_id)
                    )
                    price_id = (
                        subscription.get("items", {})
                        .get("data", [{}])[0]
                        .get("price", {})
                        .get("id")
                    )
                    db = get_firestore_client()
                    user_ref = db.collection("users").document(uid)
                    await anyio.to_thread.run_sync(
                        user_ref.update,
                        {
                            "stripeSubscriptionId": subscription_id,
                            "stripePlan": price_id,
                            "plan": "subscription",
                        },
                    )
            if uid and credits and session_id and metadata.get("mode") == "payment":
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

    if event["type"] in {"invoice.paid", "invoice.payment_succeeded"}:
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        customer_id = invoice.get("customer")
        user_ref = None
        user_snapshot = None
        if not subscription_id and customer_id:
            db = get_firestore_client()
            user_query = db.collection("users").where("stripeCustomerId", "==", customer_id)
            user_docs = await anyio.to_thread.run_sync(lambda: list(user_query.stream()))
            if user_docs:
                user_ref = user_docs[0].reference
                user_snapshot = await anyio.to_thread.run_sync(user_ref.get)
                user_data = user_snapshot.to_dict() or {}
                subscription_id = user_data.get("stripeSubscriptionId")

        price_id = await _resolve_subscription_price_id(invoice, subscription_id)
        credits_grant = _get_subscription_credits(price_id)
        invoice_id = invoice.get("id")
        if credits_grant and subscription_id and customer_id and invoice_id:
            db = get_firestore_client()
            if user_ref is None:
                user_query = db.collection("users").where("stripeCustomerId", "==", customer_id)
                user_docs = await anyio.to_thread.run_sync(lambda: list(user_query.stream()))
                if not user_docs:
                    logger.warning(
                        "stripe_invoice_no_user invoice=%s customer=%s price=%s",
                        invoice_id,
                        customer_id,
                        price_id,
                    )
                    return {"status": "ok"}
                user_ref = user_docs[0].reference
                user_snapshot = await anyio.to_thread.run_sync(user_ref.get)
            if user_ref is None:
                logger.warning(
                    "stripe_invoice_no_user invoice=%s customer=%s price=%s",
                    invoice_id,
                    customer_id,
                    price_id,
                )
                return {"status": "ok"}

            invoice_ref = db.collection("stripe_invoices").document(invoice_id)
            invoice_snapshot = await anyio.to_thread.run_sync(invoice_ref.get)
            if invoice_snapshot.exists:
                invoice_data = invoice_snapshot.to_dict() or {}
                if invoice_data.get("credits_granted"):
                    return {"status": "ok"}
            else:
                await anyio.to_thread.run_sync(
                    invoice_ref.set,
                    {
                        "subscription_id": subscription_id,
                        "customer_id": customer_id,
                        "credits_granted": False,
                        "created_at": firestore.SERVER_TIMESTAMP,
                    },
                )
            if user_snapshot is None:
                user_snapshot = await anyio.to_thread.run_sync(user_ref.get)
            current_credits = int((user_snapshot.to_dict() or {}).get("credits") or 0)
            new_credits = current_credits + credits_grant
            amount_paid = int(invoice.get("amount_paid") or 0)
            currency = invoice.get("currency") or "usd"

            await anyio.to_thread.run_sync(
                user_ref.update,
                {
                    "credits": new_credits,
                    "stripeSubscriptionId": subscription_id,
                    "stripePlan": price_id,
                    "plan": "subscription",
                    "lastPackId": "subscription",
                    "lastPurchaseAt": firestore.SERVER_TIMESTAMP,
                    "lastPurchaseAmount": amount_paid,
                    "lastPurchaseCurrency": currency,
                    "lifetimeSpend": firestore.Increment(amount_paid),
                    "lifetimeCreditsPurchased": firestore.Increment(credits_grant),
                },
            )
            logger.info(
                "stripe_invoice_credits_granted invoice=%s customer=%s price=%s credits=%s new=%s",
                invoice_id,
                customer_id,
                price_id,
                credits_grant,
                new_credits,
            )
            await anyio.to_thread.run_sync(
                invoice_ref.update,
                {"credits_granted": True},
            )
        elif invoice_id:
            logger.warning(
                "stripe_invoice_no_credits invoice=%s customer=%s subscription=%s price=%s",
                invoice_id,
                customer_id,
                subscription_id,
                price_id,
            )

    return {"status": "ok"}
