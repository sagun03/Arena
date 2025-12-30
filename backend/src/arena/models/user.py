from typing import Any, Optional

from pydantic import BaseModel, EmailStr


class UserModel(BaseModel):
    uid: str
    name: str
    email: EmailStr
    createdAt: Optional[Any] = None
    verified: bool = False
    loginProvider: str = "email"
    credits: int = 0
    stripeCustomerId: Optional[str] = None
    stripeSubscriptionId: Optional[str] = None
    stripePlan: Optional[str] = None
    plan: Optional[str] = None
    lastPackId: Optional[str] = None
    lastPurchaseAt: Optional[Any] = None
    lastPurchaseAmount: Optional[int] = None
    lastPurchaseCurrency: Optional[str] = None
    lifetimeSpend: Optional[int] = None
    lifetimeCreditsPurchased: Optional[int] = None
