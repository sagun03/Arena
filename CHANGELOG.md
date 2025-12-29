# Changelog

All notable changes to the IdeaAudit project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Phase 2: Historical Intelligence (Cross-Domain Pattern Matching)**
  - intelligent re-ranking system for cross-domain pattern matching
  - `DecisionEvidence` model for persistent storage of verdict data including kill-shots, assumptions, and recommendations
  - `HistoricalStore` class with composite scoring (semantic similarity + domain bonus + confidence)
  - Diversity re-ranking algorithm ensuring verdict type and domain diversity in retrieval results
  - Pre-Round-2 semantic search integration to retrieve and display past patterns
  - Post-verdict persistence to Chroma for building institutional memory
  - `detect_idea_domain()` helper function for consistent domain detection (SaaS, Marketplace, FinTech, B2B, B2C)
  - Feature flag `ENABLE_HISTORICAL_CONTEXT` for Phase 2 control (default: False)

- **Backend Infrastructure**
  - LLM integration with Google Gemini (`llm/gemini_client.py`, `llm/prd_extractor.py`)
  - PRD extraction functionality with dynamic structure parsing
  - Data models for Ideas and Evidence (`models/idea.py`, `models/evidence.py`)
  - ChromaDB vectorstore integration for semantic search (`vectorstore/`)
  - Embedding functionality using Google Generative AI

- **API Enhancements**
  - Comprehensive Swagger/OpenAPI documentation
  - Interactive API documentation at `/docs` (Swagger UI)
  - Alternative documentation at `/redoc` (ReDoc)
  - OpenAPI schema at `/openapi.json`
  - Enhanced endpoint documentation with request/response models
  - Improved API descriptions and metadata

- **Developer Experience**
  - Server start script (`start.sh`) with configurable options
  - Pre-commit hooks configuration for code quality
  - Type stubs for Redis (`types-redis`)
  - Enhanced README with setup and usage instructions

### Changed
- Refactored domain detection logic into centralized `detect_idea_domain()` function (DRY principle)
- Updated `Verdict` model with `recommendations` field for storing actionable pivot suggestions
- Updated `arena.py` router to integrate Phase 2 historical retrieval and persistence
- Updated configuration settings with `ENABLE_HISTORICAL_CONTEXT` feature flag
- Changed MVP evidence storage feature (`store_evidence`) to Phase 2 architecture
- Updated transcript formatting to show cross-domain patterns with confidence percentages
- Cleaned up `.env.example` to replace `STORE_EVIDENCE` with `ENABLE_HISTORICAL_CONTEXT`

- Updated FastAPI app configuration with detailed descriptions
- Enhanced router endpoints with proper Pydantic models
- Improved health check endpoint with response models
- Updated dependencies in `pyproject.toml`

### Removed
- Removed `store_evidence` MVP feature flag (replaced by Phase 2 `ENABLE_HISTORICAL_CONTEXT`)
- Removed orphaned `store_evidence_tags()` and `search_evidence()` methods from `BaseAgent`
- Removed MVP-specific evidence collection logic from agent response processing

### Fixed
- Resolved all flake8 linting errors (unused imports, line length)
- Fixed mypy type checking errors
- Added proper type annotations and casts for Redis operations
- Fixed pre-commit hook configuration for mypy

### Technical Details
- Composite scoring formula: `semantic_score (0-1) + domain_bonus (0.1) + confidence_bonus (scaled 0-0.1)`
- Diversity re-ranking ensures verdict type mix (Kill/Pivot/Proceed) and domain diversity
- Broad retrieval fetches 3x desired results across all domains, then re-ranks for diversity
- Historical store metadata includes domain, confidence, verdict, kill-shots, and recommendations
- Added `types-redis>=4.6.0` to dev dependencies
- Configured pre-commit hooks for black, isort, flake8, and mypy
- Set up proper type checking with mypy configuration
- Enhanced code formatting and linting standards
