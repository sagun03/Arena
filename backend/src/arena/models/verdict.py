"""Verdict models for debate outcomes"""

from typing import List

from pydantic import BaseModel, Field


class Scorecard(BaseModel):
    """Scorecard with scores for different dimensions"""

    overall_score: int = Field(..., ge=0, le=100, description="Overall idea score (0-100)")
    market_score: int = Field(..., ge=0, le=100, description="Market opportunity score (0-100)")
    customer_score: int = Field(..., ge=0, le=100, description="Customer fit score (0-100)")
    feasibility_score: int = Field(
        ..., ge=0, le=100, description="Technical feasibility score (0-100)"
    )
    differentiation_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Differentiation/competitive advantage score (0-100)",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "overall_score": 42,
                "market_score": 35,
                "customer_score": 50,
                "feasibility_score": 60,
                "differentiation_score": 25,
            }
        }


class KillShot(BaseModel):
    """A critical flaw or risk that could kill the idea"""

    title: str = Field(..., description="Short title of the kill-shot")
    description: str = Field(..., description="Detailed description of why this kills the idea")
    severity: str = Field(..., description="Severity level: 'critical', 'high', or 'medium'")
    agent: str = Field(..., description="Agent that identified this kill-shot")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Market Saturated",
                "description": (
                    "The market is already dominated by 3 major players " "with 90% market share"
                ),
                "severity": "critical",
                "agent": "Market",
            }
        }


class TestPlanItem(BaseModel):
    """A single day's task in the 7-day validation test plan"""

    day: int = Field(..., ge=1, le=7, description="Day number (1-7)")
    task: str = Field(..., description="Task to perform on this day")
    success_criteria: str = Field(..., description="How to measure success for this task")

    class Config:
        json_schema_extra = {
            "example": {
                "day": 1,
                "task": "Interview 5 target customers about the problem",
                "success_criteria": "At least 3 confirm the problem exists and would pay",
            }
        }


class InvestorReadiness(BaseModel):
    """How investable the pitch is right now."""

    score: int = Field(..., ge=0, le=100, description="Investor readiness score (0-100)")
    verdict: str = Field(
        ...,
        description="Short label: 'NotReady', 'Warm', or 'InvestorReady'",
    )
    reasons: List[str] = Field(..., max_length=5, description="Top reasons driving the score")

    class Config:
        json_schema_extra = {
            "example": {
                "score": 32,
                "verdict": "NotReady",
                "reasons": [
                    "No clear distribution channel",
                    "Weak differentiation in a saturated market",
                    "Unvalidated willingness to pay",
                ],
            }
        }


class Verdict(BaseModel):
    """Final verdict from the debate"""

    decision: str = Field(
        ...,
        description="Final decision: 'Proceed', 'Pivot', 'Kill', or 'NeedsMoreData'",
    )
    scorecard: Scorecard = Field(..., description="Detailed scorecard")
    kill_shots: List[KillShot] = Field(
        ..., max_length=5, description="Top 5 critical flaws (kill-shots)"
    )
    assumptions: List[str] = Field(..., description="List of key assumptions that need validation")
    recommendations: List[str] = Field(
        default_factory=list,
        description=(
            "Actionable recommendations for founder (e.g., 'Validate unit economics', "
            "'Partner with distribution channels')"
        ),
    )
    test_plan: List[TestPlanItem] = Field(
        ..., max_length=7, description="7-day validation test plan"
    )
    pivot_ideas: List[str] = Field(
        default_factory=list, max_length=3, description="Three pivot directions to consider"
    )
    investor_readiness: InvestorReadiness = Field(
        default_factory=lambda: InvestorReadiness(
            score=0,
            verdict="NotReady",
            reasons=["Investor readiness not assessed."],
        ),
        description="Investor readiness assessment",
    )
    reasoning: str = Field(..., description="Detailed reasoning behind the verdict decision")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence in the verdict (0.0-1.0)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "decision": "Pivot",
                "scorecard": {
                    "overall_score": 42,
                    "market_score": 35,
                    "customer_score": 50,
                    "feasibility_score": 60,
                    "differentiation_score": 25,
                },
                "kill_shots": [
                    {
                        "title": "Market Saturated",
                        "description": "Market dominated by established players",
                        "severity": "critical",
                        "agent": "Market",
                    }
                ],
                "assumptions": [
                    "Customers are willing to pay $50/month",
                    "Market size is $10B",
                ],
                "test_plan": [
                    {
                        "day": 1,
                        "task": "Interview 5 target customers",
                        "success_criteria": "3+ confirm problem exists",
                    }
                ],
                "pivot_ideas": [
                    "Target HR departments with a compliance-first wedge",
                    "Bundle with ATS integrations for distribution",
                    "Pivot to internal talent mobility tooling",
                ],
                "investor_readiness": {
                    "score": 32,
                    "verdict": "NotReady",
                    "reasons": [
                        "No clear distribution channel",
                        "Weak differentiation",
                        "Pricing not validated",
                    ],
                },
                "reasoning": "The idea has potential but needs significant pivoting...",
                "confidence": 0.75,
            }
        }
