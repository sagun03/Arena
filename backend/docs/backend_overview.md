# ARENA Backend Overview

## What this service does
- FastAPI service orchestrating a multi-agent “debate” over a PRD to produce a structured verdict.
- No Redis or server-side caches; state is in-memory, vectors in ChromaDB.
- LLM: Google Gemini (chat + embeddings) with per-debate rate limiting and exponential backoff.

## High-level flow
1) **Input**: PRD text arrives at `/arena/validate`.
2) **Extraction**: `extract_idea_from_prd` (Gemini) builds `Idea` with structured `ExtractedStructure` and title.
3) **State init**: `state_manager` stores debate state (in-memory) with `current_round` / `round_status`.
4) **Debate**: Agents run rounds (clarification → attacks → defense → verdict). Worker agents use templates; Judge scores/validates.
5) **Verdict**: `JudgeAgent.generate_verdict` produces `Verdict` (scorecard + kill shots + recommendations).
6) **Serve**: Clients poll `/arena/debate/{id}` and `/arena/debate/{id}/verdict`; graph progress via `/arena/graph/structure` and `/arena/debate/{id}/graph`.

## Key modules
- **API**: `routers/arena.py`, `routers/health.py`, FastAPI app in `main.py`.
- **LLM**: `llm/gemini_client.py`, prompts in `llm/prompts.py`, rate limiting/backoff in `llm/rate_control.py`, PRD extraction in `llm/prd_extractor.py`.
- **Agents**: `agents/base_agent.py`, `agents/base_worker.py`, worker agents (`customer_`, `market_`, `skeptic_`, `builder_`), `judge_agent.py`.
- **Models**: `models/idea.py`, `models/evidence.py`, `models/verdict.py`, `models/decision_evidence.py`, `models/debate_state.py`.
- **Vector store**: `vectorstore/chroma_client.py`, `evidence_store.py`, `historical_store.py`, embeddings in `vectorstore/embeddings.py`.
- **State**: `state_manager.py` (in-memory per-debate dict; non-durable).
- **Observability**: `monitoring/metrics.py` (Counter + structured logs), `observability/tracing.py` (decorators).

## Agents at a glance
- **BaseAgent**: LLM call with `llm_call_with_limits`, prompt formatting tolerant to missing vars, evidence parsing helpers.
- **BaseWorkerAgent**: executes a prompt with idea + extracted structure + optional attacks context.
- **Worker agents**: Customer (pain/WTP), Market (competition/size), Skeptic (risks), Builder (feasibility/defense). All accept optional `llm` for testing.
- **JudgeAgent**: quality gates, verdict creation; `validate_quality_gate` test-friendly wrapper.

## Rate control & resilience
- Config in `config/settings.py`: `llm_max_concurrency_per_debate`, `llm_backoff_max_attempts`, `llm_backoff_base_delay`, `llm_backoff_max_delay`.
- `llm_call_with_limits` and `embeddings_call_with_limits` wrap all LLM/embedding calls with per-debate semaphores + exponential backoff.

## Data & storage
- **State**: in-memory (process-local). No Redis.
- **Vectors**: ChromaDB at `chromadb_path` (default `./chroma_db`).
- **Caches**: none (prompt/embedding/PRD caches removed).

## Endpoints (router/arena.py)
- `POST /arena/validate`: start debate, returns `debate_id`, seeds state with `current_round`, `round_status`, `idea_title`.
- `GET /arena/debate/{id}`: debate state (status, transcript, current_round, round_status, idea_title).
- `GET /arena/debate/{id}/verdict`: verdict when ready.
- `GET /arena/graph/structure`: static nodes/edges/mermaid.
- `GET /arena/debate/{id}/graph`: progress (completed/pending nodes) from current_round.
- `GET /health`: health check.

## Testing
- Pytest suite in `tests/` (agents, API, integration, models, tracing). External LLM calls are mocked. Current status: 32/32 passing.

## Historical learning (currently off)
- Flag: `enable_historical_context` (default False) in `config/settings.py`.
- Store & retrieve similar ideas: `vectorstore/historical_store.py` using embeddings from `vectorstore/embeddings.py`.
- To enable learning from past:
  1) Set `enable_historical_context=True`.
  2) On verdict, persist `DecisionEvidence` (summary, verdict decision/score, assumptions, kill shots, recommendations, domain, confidence) via `persist_decision_evidence`.
  3) On debate start, embed the idea and call `retrieve_similar_ideas(query_embedding, n_results, domain_filter)`; inject top precedents into agent prompts (keep concise: verdict summary + top 2–3 kill shots/assumptions).
  4) Log precedent IDs with verdict for offline evaluation.

## Notable removals
- Redis removed entirely (code, settings, dependencies). Cache folder deleted; prompt/embedding/PRD caches removed.
- No server-side caching remains; only in-memory state and Chroma vectors.

## Operational notes
- Requires `GOOGLE_API_KEY` and model names in environment or `.env`.
- Backoff/rate limits protect against 429s; debate-local semaphore prevents agent stampedes.
- State is ephemeral (per-process). For durability or multi-instance, replace `state_manager` with a shared store.
