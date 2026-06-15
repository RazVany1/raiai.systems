#!/usr/bin/env python
"""Funding Reset Live Pilot executor.

Safety model:
- default mode is DRY RUN: generate order tickets only, no live orders;
- live execution requires all of:
  1. --execute
  2. --confirm SYMBOL
  3. environment RAI_LIVE_TRADING_ENABLED=YES
  4. exchange credentials configured

This script is intentionally conservative. It is the single entry point that a
future real exchange adapter should use, so the dashboard/chat does not place
orders directly.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = PROJECT_ROOT / "public" / "data" / "funding-reset-reclaim-snapshot.json"
OUTPUT_PATH = PROJECT_ROOT / "public" / "data" / "funding-live-pilot-tickets.json"
STATUS_PATH = PROJECT_ROOT / "public" / "data" / "funding-live-pilot-status.json"

PILOT_MARGIN_USD = 50.0
PILOT_LEVERAGE = 3
PILOT_NOTIONAL_USD = PILOT_MARGIN_USD * PILOT_LEVERAGE
PILOT_MAX_OPEN_LIVE = 3
PILOT_MIN_SCORE = 85.0
PILOT_ALLOWED_GRADES = {"A"}


@dataclass
class LivePilotTicket:
    createdAt: str
    strategy: str
    mode: str
    exchange: str
    symbol: str
    side: str
    orderType: str
    entryPrice: float
    stopLoss: float
    takeProfit1: float
    runnerTarget: float
    marginUsd: float
    leverage: int
    notionalUsd: float
    grade: str
    score: float
    status: str
    executionNote: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path, default: Any) -> Any:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def number(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        out = float(value)
        return out if out == out and out not in (float("inf"), float("-inf")) else None
    except Exception:
        return None


def is_candidate_eligible(candidate: dict[str, Any]) -> bool:
    score = number(candidate.get("score", candidate.get("setupScore"))) or 0.0
    return (
        str(candidate.get("grade", "")) in PILOT_ALLOWED_GRADES
        and score >= PILOT_MIN_SCORE
        and number(candidate.get("price")) is not None
        and number(candidate.get("stop")) is not None
        and number(candidate.get("tp1Price")) is not None
        and number(candidate.get("runnerTargetPrice")) is not None
    )


def build_ticket(candidate: dict[str, Any], exchange: str, order_type: str) -> LivePilotTicket:
    score = number(candidate.get("score", candidate.get("setupScore"))) or 0.0
    return LivePilotTicket(
        createdAt=now_iso(),
        strategy="FUNDING_RESET_RECLAIM",
        mode="LIVE_PILOT_SEMI_MANUAL",
        exchange=exchange,
        symbol=str(candidate.get("symbol")),
        side=str(candidate.get("side")),
        orderType=order_type,
        entryPrice=float(number(candidate.get("price")) or 0.0),
        stopLoss=float(number(candidate.get("stop")) or 0.0),
        takeProfit1=float(number(candidate.get("tp1Price")) or 0.0),
        runnerTarget=float(number(candidate.get("runnerTargetPrice")) or 0.0),
        marginUsd=PILOT_MARGIN_USD,
        leverage=PILOT_LEVERAGE,
        notionalUsd=PILOT_NOTIONAL_USD,
        grade=str(candidate.get("grade")),
        score=score,
        status="DRY_RUN_READY",
        executionNote="No live order sent. Requires --execute --confirm SYMBOL and exchange credentials.",
    )


def select_candidates(symbol: str | None) -> list[dict[str, Any]]:
    snapshot = load_json(SNAPSHOT_PATH, {})
    candidates = snapshot.get("candidates", []) if isinstance(snapshot.get("candidates"), list) else []
    eligible = [c for c in candidates if isinstance(c, dict) and is_candidate_eligible(c)]
    if symbol:
        eligible = [c for c in eligible if str(c.get("symbol", "")).upper() == symbol.upper()]
    return sorted(eligible, key=lambda c: number(c.get("score", c.get("setupScore"))) or 0.0, reverse=True)


def credentials_ready(exchange: str) -> tuple[bool, str]:
    if exchange == "hyperliquid":
        # Do not store secrets in repo. Configure these in the local environment only.
        if not os.environ.get("HYPERLIQUID_PRIVATE_KEY"):
            return False, "missing HYPERLIQUID_PRIVATE_KEY"
        if not os.environ.get("HYPERLIQUID_ACCOUNT_ADDRESS"):
            return False, "missing HYPERLIQUID_ACCOUNT_ADDRESS"
        try:
            import hyperliquid  # type: ignore  # noqa: F401
            import eth_account  # type: ignore  # noqa: F401
        except Exception as exc:
            return False, f"missing Hyperliquid SDK dependencies: {exc}"
        return True, "credentials and SDK available"
    if exchange == "asterdex":
        if not os.environ.get("ASTERDEX_API_KEY") or not os.environ.get("ASTERDEX_API_SECRET"):
            return False, "missing ASTERDEX_API_KEY/ASTERDEX_API_SECRET"
        return True, "credentials available"
    return False, f"unsupported exchange {exchange}"


def execute_live_order(ticket: LivePilotTicket) -> dict[str, Any]:
    """Guarded placeholder for real adapter.

    The adapter is intentionally not wired to send live orders until credentials
    and SDK are present and a final implementation is validated on a tiny test
    order. This prevents accidental live trading from a dashboard/chat bug.
    """
    ok, reason = credentials_ready(ticket.exchange)
    if not ok:
        return {"ok": False, "status": "blocked", "reason": reason}
    return {
        "ok": False,
        "status": "blocked",
        "reason": "live adapter not yet armed; validate exchange-specific order placement first",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Funding Reset live pilot ticket/executor")
    parser.add_argument("--exchange", choices=["hyperliquid", "asterdex"], default="hyperliquid")
    parser.add_argument("--symbol", help="Only generate ticket for this symbol")
    parser.add_argument("--order-type", choices=["limit", "market"], default="limit")
    parser.add_argument("--execute", action="store_true", help="Attempt real execution (requires explicit guards)")
    parser.add_argument("--confirm", help="Must equal SYMBOL to execute")
    args = parser.parse_args()

    candidates = select_candidates(args.symbol)
    tickets = [build_ticket(c, args.exchange, args.order_type) for c in candidates]
    payload = {
        "updatedAt": now_iso(),
        "strategy": "FUNDING_RESET_RECLAIM",
        "pilotRules": {
            "marginUsd": PILOT_MARGIN_USD,
            "leverage": PILOT_LEVERAGE,
            "notionalUsd": PILOT_NOTIONAL_USD,
            "maxOpenLive": PILOT_MAX_OPEN_LIVE,
            "minScore": PILOT_MIN_SCORE,
            "allowedGrades": sorted(PILOT_ALLOWED_GRADES),
        },
        "tickets": [asdict(t) for t in tickets],
    }
    save_json(OUTPUT_PATH, payload)

    status: dict[str, Any] = {
        "updatedAt": now_iso(),
        "exchange": args.exchange,
        "executeRequested": bool(args.execute),
        "selectedTickets": len(tickets),
        "action": "dry_run",
        "message": f"Generated {len(tickets)} live-pilot ticket(s); no live orders sent.",
        "ticketsPath": str(OUTPUT_PATH),
    }

    if args.execute:
        if not tickets:
            status.update(action="blocked", message="No eligible ticket to execute.")
        elif len(tickets) > 1 and not args.symbol:
            status.update(action="blocked", message="Execution requires --symbol when multiple candidates exist.")
        else:
            ticket = tickets[0]
            if os.environ.get("RAI_LIVE_TRADING_ENABLED") != "YES":
                status.update(action="blocked", message="Set RAI_LIVE_TRADING_ENABLED=YES to allow live execution.")
            elif args.confirm != ticket.symbol:
                status.update(action="blocked", message=f"Execution requires --confirm {ticket.symbol}.")
            else:
                result = execute_live_order(ticket)
                status.update(action="execute_attempt", executionResult=result)
    save_json(STATUS_PATH, status)
    print(json.dumps(status, indent=2, ensure_ascii=False))
    return 0 if status.get("action") in {"dry_run", "blocked"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
