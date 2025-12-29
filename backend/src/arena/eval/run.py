"""CLI entrypoint for offline evaluation.

Usage:
    python -m arena.eval.run --with-history --no-history --data data/eval_runs.jsonl
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from arena.observability.eval import compute_metrics, pretty_print

DEFAULT_DATA_PATH = Path("data/eval_runs.jsonl")


def load_runs(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    runs: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                runs.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return runs


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline evaluation for IdeaAudit Phase 2")
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to JSONL eval runs (each line = run dict)",
    )
    parser.add_argument(
        "--with-history",
        action="store_true",
        help="Include runs executed with historical context enabled",
    )
    parser.add_argument(
        "--no-history",
        action="store_true",
        help="Include runs executed with historical context disabled",
    )

    args = parser.parse_args(argv)
    runs = load_runs(args.data)
    if not runs:
        print(f"No evaluation runs found at {args.data}. Add JSONL data and retry.")
        return 1

    filtered = runs
    if args.with_history and not args.no_history:
        filtered = [r for r in runs if r.get("with_history")]
    elif args.no_history and not args.with_history:
        filtered = [r for r in runs if not r.get("with_history")]

    metrics = compute_metrics(filtered)
    print(pretty_print(metrics))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
