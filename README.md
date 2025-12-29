# ARENA – Agentic Idea Validation Platform

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **"Disagree by default. Validate ideas through structured adversarial reasoning, not optimism."**

ARENA is a multi-agent system that stress-tests business ideas through structured debate. Unlike traditional validators that reinforce optimism, ARENA forces disagreement, surfaces weak logic, and produces evidence-backed verdicts.

## 🎯 What It Does

Submit your business idea → ARENA runs it through a 5-round adversarial debate → Get a verdict: **Proceed / Pivot / Kill / Needs More Data**

## ✨ Key Features

- **5-Round Debate Protocol**: Clarification → Attacks → Defense → Cross-Examination → Verdict
- **Multi-Agent Architecture**: Supervisor (Judge) + Workers (Skeptic, Customer, Market, Builder)
- **Evidence Tagging**: Every claim tagged as Verified, Assumption, or NeedsValidation
- **Clear Outputs**: Scorecard (0-100), Top 5 Kill-Shots, Assumptions List, 7-Day Test Plan
- **Lightweight Core**: In-memory state management, zero external caching dependencies
- **Beautiful UI**: Next.js 16 with Assistant UI

## 🏗️ Architecture

```
User → Frontend (Next.js) → Backend (FastAPI) → Agents (Gemini)
                                              ↓
                                         In-Memory State
                                         ChromaDB (Evidence)
```

## 🛠️ Tech Stack

**Backend:** Python, FastAPI, LangChain, Google Gemini, ChromaDB
**Frontend:** Next.js 16, TypeScript, Assistant UI, Tailwind CSS
**Storage:** In-memory state management (MVP), upgrading to database for production

## 🚀 Quick Start

### Quick Commands

```bash
# Install dependencies
cd backend && unset UV_EXTRA_INDEX_URL && uv sync
cd frontend && npm install

# Start servers
cd backend && unset UV_EXTRA_INDEX_URL && uv run uvicorn src.arena.main:app --reload
cd frontend && npm run dev  # In another terminal
```

See [COMMANDS.md](./COMMANDS.md) for full command reference.

### Prerequisites
- Python 3.11+, Node.js 18+
- `uv` package manager
- Google Gemini API key

### Local Development

```bash
# Clone repository
git clone https://github.com/sagun03/Arena.git
cd Arena

# Backend
cd backend
uv sync
cp .env.example .env  # Add your Gemini API key
uv run uvicorn src.arena.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Deploy to Cloud Run

```bash
# Deploy Backend
cd backend
gcloud run deploy arena-backend --source . --allow-unauthenticated

# Deploy Frontend
cd frontend
gcloud run deploy arena-frontend --source . --allow-unauthenticated

# Note: For production, migrate from in-memory to persistent database
```

## 📖 Usage

### API Example

```bash
POST /arena/validate
{
  "idea": "A platform connecting freelance designers with clients",
  "target_customer": "Small businesses",
  "market": "Global",
  "pricing_assumption": "$50-200 per project"
}
```

### Response

```json
{
  "verdict": {
    "decision": "Pivot",
    "score": 42,
    "kill_shots": ["Market saturated", "High CAC", "No differentiation"],
    "assumptions": ["Customers willing to pay", "Designers will join"],
    "test_plan": { "day_1": "...", ... }
  }
}
```

## 🎨 UI Preview

- **Debate Timeline**: Real-time visualization of debate rounds
- **Interactive Graph**: LangGraph state machine visualization
- **Agent Responses**: Color-coded messages from each agent
- **Evidence Tags**: Visual badges for Verified/Assumption/NeedsValidation
- **Verdict Display**: Scorecard, kill-shots, and test plan

## 🔧 Configuration

Environment variables:
- `GOOGLE_API_KEY` - Gemini API key (required)
- `CHROMADB_PATH` - Path for ChromaDB vector store (default: ./chroma_db)
- `ENVIRONMENT` - Set to 'development' or 'production' (default: development)
- `LOG_LEVEL` - Logging level (default: INFO)

## 📊 Monitoring

- **Structured Logging**: All agent calls and debate flow logged
- **State Management**: In-memory tracking during MVP phase
- **ChromaDB**: Evidence storage and vector similarity search

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Key Principles

1. **Disagree by Default** - Agents challenge, not agree
2. **Evidence Over Confidence** - Every claim explicitly tagged
3. **Controlled Orchestration** - Structured debate protocol
4. **Decision-Oriented** - Goal is verdict, not inspiration

## 📄 License

Licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

**Remember**: ARENA is designed to be harsh, not helpful. If your idea survives ARENA's adversarial reasoning, you've likely found something worth building.
