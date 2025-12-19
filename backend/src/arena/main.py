"""FastAPI application entry point"""

from arena.routers import arena, health
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ARENA API",
    description="Agentic Idea Validation Platform",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(arena.router, prefix="/arena", tags=["arena"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ARENA API", "version": "0.1.0"}
