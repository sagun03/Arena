# ARENA Backend

FastAPI backend for the ARENA platform.

## Setup

1. **Install dependencies**:
```bash
# Option 1: Use Make (recommended)
make install

# Option 2: Use setup script
./setup.sh

# Option 3: Manual
uv sync
```

2. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run the server:
```bash
# Option 1: Use the start script (recommended)
./start.sh

# Option 2: Use uv directly
uv run uvicorn src.arena.main:app --reload

# Option 3: Custom host/port
./start.sh --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

## Project Structure

```
backend/
├── src/arena/
│   ├── main.py              # FastAPI app entry point
│   ├── config/              # Configuration and settings
│   ├── models/              # Data models
│   ├── routers/             # API endpoints
│   ├── agents/               # Agent implementations
│   ├── graph/                # LangGraph state machine
│   ├── llm/                  # LangChain & Gemini setup
│   ├── redis/                # Redis integration
│   ├── vectorstore/          # ChromaDB integration
│   └── observability/        # LangSmith integration
└── tests/                    # Test suite
```

## Available Commands

- `./start.sh` - Start the development server (with auto-reload)
- `./start.sh --port 8080` - Start server on custom port
- `./start.sh --no-reload` - Start server without auto-reload (production mode)
- `./setup.sh` - Install dependencies
- `uv sync` - Sync dependencies manually
