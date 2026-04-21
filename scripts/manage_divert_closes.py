import json
from datetime import datetime, timezone
from pathlib import Path

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
POST_EXIT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json")
OUT_PATH = TRADE_LOG_PATH


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def infer_exit_reason(side, live_price, entry, invalidation):
    if side == "SELL":
        # invalidare hard
        if invalidation is not None and live_price >= invalidation:
            return "invalidation_break"
        # exit standard pe reactia initiala
        if entry is not None and live_price <= entry * 0.97:
            return "initial_bounce_capture"
        # extensie partiala / slabire ulterioara
        if entry is not None and live_price <= entry * 0.985:
            return "partial_objective_hit"
    else:
        # invalidare hard
        if invalidation is not None and live_price <= invalidation:
            return "invalidation_break"
        # exit standard pe reactia initiala
        if entry is not None and live_price >= entry * 1.03:
            return "initial_bounce_capture"
        # extensie partiala / slabire ulterioara
        if entry is not None and live_price >= entry * 1.015:
            return "partial_objective_hit"
    return None


def main():
    trade_log = load_json(TRADE_LOG_PATH, [])
    live_market = load_json(LIVE_MARKET_PATH, {"rows": []})
    post_exit = load_json(POST_EXIT_PATH, [])
    market_map = {row.get("symbol"): row for row in live_market.get("rows", [])}
    now = datetime.now(timezone.utc).isoformat()

    updated = []
    for row in trade_log:
        if row.get("status") != "open":
            updated.append(row)
            continue

        symbol = row.get("symbol")
        market = market_map.get(symbol, {})
        live_price = market.get("livePrice")
        entry = row.get("entryPrice")
        invalidation = row.get("invalidationPrice")
        side = row.get("side")
        pnl = market.get("livePnlPct")

        if live_price is None or entry is None:
            updated.append(row)
            continue

        exit_reason = infer_exit_reason(side, float(live_price), float(entry), float(invalidation) if invalidation is not None else None)
        if exit_reason is None:
            updated.append(row)
            continue

        closed_row = {
            **row,
            "status": "closed",
            "exitPrice": round(float(live_price), 6),
            "resultPct": round(float(pnl), 2) if pnl is not None else row.get("resultPct"),
            "closedAt": now,
            "notes": list(row.get("notes", [])) + [f"auto_close:{exit_reason}", "alert:close_sent"],
        }
        updated.append(closed_row)

        post_exit.append({
            "symbol": symbol,
            "timeframe": row.get("timeframe"),
            "entryPrice": entry,
            "exitPrice": round(float(live_price), 6),
            "invalidationPrice": invalidation,
            "quality": row.get("quality"),
            "risk": "live_managed",
            "patternContext": "live_managed",
            "exitReason": exit_reason,
            "postExitReturns": {
                "bars_5": 0.0,
                "bars_10": 0.0,
                "bars_20": 0.0
            },
            "postExitMaxReturn": 0.0,
            "notes": [
                "auto-generated from close management layer",
                f"closed_at_live_price={round(float(live_price), 6)}"
            ],
        })

    OUT_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    POST_EXIT_PATH.write_text(json.dumps(post_exit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)
    print(POST_EXIT_PATH)


if __name__ == "__main__":
    main()
