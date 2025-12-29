# IdeaAudit Project Commands

Quick reference for common commands.

## Quick Start

```bash
# Install everything
cd backend && unset UV_EXTRA_INDEX_URL && uv sync
cd frontend && npm install

# Start backend server
cd backend && unset UV_EXTRA_INDEX_URL && uv run uvicorn src.arena.main:app --reload

# Start frontend server (in another terminal)
cd frontend && npm run dev
```

## Installation

```bash
# Backend
cd backend
unset UV_EXTRA_INDEX_URL && uv sync

# Frontend
cd frontend
npm install
```

## Development

```bash
# Backend (http://localhost:8000)
cd backend
unset UV_EXTRA_INDEX_URL && uv run uvicorn src.arena.main:app --reload

# Frontend (http://localhost:3000)
cd frontend
npm run dev
```

## Testing

```bash
# Backend tests
cd backend
unset UV_EXTRA_INDEX_URL && uv run pytest

# Frontend tests
cd frontend
npm test
```

## Code Quality

### Linting

```bash
# Backend linters
cd backend
unset UV_EXTRA_INDEX_URL && uv run pre-commit run --all-files

# Frontend linter
cd frontend
npm run lint
cd "/Users/sagunsaluja/ARENA project/frontend" && pkill -f "next dev" && sleep 2 && echo "Killed existing Next.js processes"
```

### Formatting

```bash
# Backend formatting
cd backend
unset UV_EXTRA_INDEX_URL && uv run black src tests
unset UV_EXTRA_INDEX_URL && uv run isort src tests

# Frontend formatting
cd frontend
npx prettier --write .
```

## Pre-commit Hooks

```bash
# Run pre-commit on all files
cd backend && unset UV_EXTRA_INDEX_URL && uv run pre-commit run --all-files
cd frontend && npx lint-staged

# Install pre-commit hooks (run once)
cd backend && unset UV_EXTRA_INDEX_URL && uv run pre-commit install
cd backend && unset UV_EXTRA_INDEX_URL && uv run pre-commit install --hook-type pre-push
cd frontend && npm run prepare
```

## Cleanup

```bash
# Backend
cd backend
rm -rf .venv __pycache__
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# Frontend
cd frontend
rm -rf .next node_modules
```

## Docker

```bash
# Start all services (backend, frontend)
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

## Backend Setup Script

```bash
# Use the setup script (handles UV_EXTRA_INDEX_URL automatically)
cd backend
./setup.sh
```
