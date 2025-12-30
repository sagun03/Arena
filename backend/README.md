# ARENA Backend

FastAPI backend for the ARENA platform.

Phase 2 treats historical debates as training data, not memory, enabling offline learning and evaluation while preserving deterministic inference paths.

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
# Edit .env with your secrets and origins
```

3. Run the server:
```bash
# Option 1: Use the start script (recommended)
./start.sh

# Option 2: Use uv directly
uv run uvicorn arena.main:app --reload

# Option 3: Custom host/port
./start.sh --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`

### Environment Variables

- `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to Firebase service account JSON (backend only)
- `FIREBASE_PROJECT_ID`: Optional project override (backend)
- `JWT_SECRET`: Secret for backend session JWTs (backend)
- `JWT_EXP_MINUTES`: Session token lifetime in minutes (backend)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins (backend), e.g., `http://localhost:3000`
- `STRIPE_SECRET_KEY`: Stripe secret key (backend)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (backend)
- `STRIPE_SUCCESS_URL`: Stripe Checkout success redirect URL
- `STRIPE_CANCEL_URL`: Stripe Checkout cancel redirect URL
- `STRIPE_PRICE_STARTER_CAD`: Stripe price ID for the Starter pack in CAD (10 credits)
- `STRIPE_PRICE_PLUS_CAD`: Stripe price ID for the Plus pack in CAD (20 credits)
- `STRIPE_PRICE_PRO_CAD`: Stripe price ID for the Pro pack in CAD (50 credits)
- `STRIPE_PRICE_STARTER_INR`: Stripe price ID for the Starter pack in INR (10 credits)
- `STRIPE_PRICE_PLUS_INR`: Stripe price ID for the Plus pack in INR (20 credits)
- `STRIPE_PRICE_PRO_INR`: Stripe price ID for the Pro pack in INR (50 credits)

On the frontend, configure Firebase SDK with:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_RECAPTCHA_V3_SITE_KEY` (App Check)
- `REACT_APP_APPCHECK_DEBUG_TOKEN` (optional for local dev)

### Auth Flow

- Frontend performs login/sign-up (email/password or Google) using Firebase JS SDK.
- Frontend sends Firebase `idToken` to backend `/auth/login` (or `/auth/google`).
- Backend verifies the token via Firebase Admin SDK, upserts a Firestore user, and returns a short-lived `sessionToken`.
- Protected endpoints require authentication via tokens.

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
