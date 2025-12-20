# Changelog

All notable changes to the ARENA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Backend Infrastructure**
  - LLM integration with Google Gemini (`llm/gemini_client.py`, `llm/prd_extractor.py`)
  - PRD extraction functionality with dynamic structure parsing
  - Data models for Ideas and Evidence (`models/idea.py`, `models/evidence.py`)
  - Redis integration for debate state management (`redis/redis_client.py`, `redis/debate_store.py`)
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
- Updated FastAPI app configuration with detailed descriptions
- Enhanced router endpoints with proper Pydantic models
- Improved health check endpoint with response models
- Updated dependencies in `pyproject.toml`

### Fixed
- Resolved all flake8 linting errors (unused imports, line length)
- Fixed mypy type checking errors
- Added proper type annotations and casts for Redis operations
- Fixed pre-commit hook configuration for mypy

### Technical Details
- Added `types-redis>=4.6.0` to dev dependencies
- Configured pre-commit hooks for black, isort, flake8, and mypy
- Set up proper type checking with mypy configuration
- Enhanced code formatting and linting standards
