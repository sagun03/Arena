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
uv run uvicorn src.arena.main:app --reload
```

Server will be available at `http://localhost:8000`

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

- `make install` - Install dependencies
- `make dev` - Start development server
- `make test` - Run tests
- `make lint` - Run linters
- `make format` - Format code
- `make clean` - Clean up generated files
