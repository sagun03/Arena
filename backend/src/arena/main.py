"""FastAPI application entry point"""

from arena.config.settings import settings
from arena.routers import arena, auth, billing, health, interviews
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="IdeaAudit API",
    description="""
    **IdeaAudit (Agentic Idea Validation Platform)** - An AI-powered platform for validating
    business ideas through structured debates between AI agents.

    ## Features

    * 🎯 **Idea Validation**: Submit PRDs and business ideas for AI-powered validation
    * 🤖 **Agent Debates**: Watch AI agents debate the merits and risks of your idea
    * 📊 **Evidence Collection**: Automatic evidence gathering and analysis
    * ✅ **Verdict Generation**: Get comprehensive verdicts with recommendations

    ## API Documentation

    * **Swagger UI**: Available at `/docs` - Interactive API documentation
    * **ReDoc**: Available at `/redoc` - Alternative API documentation
    * **OpenAPI Schema**: Available at `/openapi.json` - Machine-readable API schema
    """,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    tags_metadata=[
        {
            "name": "health",
            "description": "Health check endpoints for monitoring API status.",
        },
        {
            "name": "arena",
            "description": """
            Core IdeaAudit endpoints for idea validation and debate management.

            * **Validate Ideas**: Submit PRDs and business ideas for validation
            * **Debate Management**: Track and retrieve debate progress
            * **Verdicts**: Get final verdicts and recommendations
            """,
        },
        {
            "name": "billing",
            "description": "Stripe checkout and credit management endpoints.",
        },
        {
            "name": "interviews",
            "description": "Synthetic customer interviews and rebuttal chats.",
        },
    ],
)

# CORS middleware
origins = (
    [o.strip() for o in settings.cors_allowed_origins.split(",")]
    if settings.cors_allowed_origins
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(arena.router, prefix="/arena", tags=["arena"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(interviews.router, prefix="/arena", tags=["interviews"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "IdeaAudit API", "version": "0.1.0"}
