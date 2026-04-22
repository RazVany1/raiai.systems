import json
import time
from datetime import datetime, timezone
from pathlib import Path
import urllib.request

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
POSITION_TRACKER_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-position-tracker.json")
POST_EXIT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json")
STATUS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-open-monitor.json")
POLL_SECONDS = 30


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def fetch_price(symbol: str):
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return float(data["price"])
    except Exception:
        return None


def compute_pnl_pct(side, entry, price):
    if entry in (None, 0) or price is None:
        return None
    raw = ((float(price) - float(entry)) / float(entry)) * 100
    if side == "SELL":
        raw = -raw
    return round(raw, 2)


def infer_exit_reason(side, price, entry, invalidation):
    if side == "SELL":
        if invalidation is not None and price >= invalidation:
            return "invalidation_break"
        if entry is not None and price <= entry * 0.97:
            return "initial_bounce_capture"
        if entry is not None and price <= entry * 0.985:
            return "partial_objective_hit"
    else:
        if invalidation is not None and price <= invalidation:
            return "invalidation_break"
        if entry is not None and price >= entry * 1.03:
            return "initial_bounce_capture"
        if entry is not None and price >= entry * 1.015:
            return "partial_objective_hit"
    return None


def refresh_open_positions_once():
    trade_log = load_json(TRADE_LOG_PATH, [])
    post_exit = load_json(POST_EXIT_PATH, [])
    now = datetime.now(timezone.utc).isoformat()

    market_rows = []
    updated_trade_log = []
    open_count = 0
    close_events = []

    for row in trade_log:
        if row.get("status") != "open":
            updated_trade_log.append(row)
            continue

        open_count += 1
        symbol = row.get("symbol")
        side = row.get("side")
        entry = row.get("entryPrice")
        invalidation = row.get("invalidationPrice")
        price = fetch_price(symbol)
        pnl = compute_pnl_pct(side, entry, price)

        market_rows.append({
            "symbol": symbol,
            "livePrice": round(price, 6) if price is not None else None,
            "entryPrice": entry,
            "invalidationPrice": invalidation,
            "side": side,
            "livePnlPct": pnl,
            "marketTimestamp": now,
        })

        if price is None or entry is None:
            updated_trade_log.append(row)
            continue

        exit_reason = infer_exit_reason(side, float(price), float(entry), float(invalidation) if invalidation is not None else None)
        if exit_reason is None:
            notes = [n for n in list(row.get("notes", [])) if not str(n).startswith("live:")]
            notes.append(f"live:price={round(float(price), 6)}")
            if pnl is not None:
                notes.append(f"live:pnlPct={pnl}")
            updated_trade_log.append({**row, "resultPct": pnl, "notes": notes})
            continue

        closed_row = {
            **row,
            "status": "closed",
            "exitPrice": round(float(price), 6),
            "resultPct": pnl,
            "closedAt": now,
            "notes": list(row.get("notes", [])) + [f"auto_close:{exit_reason}", "monitor:close_sent"],
        }
        updated_trade_log.append(closed_row)
        close_events.append({"symbol": symbol, "reason": exit_reason, "exitPrice": round(float(price), 6), "at": now})
        post_exit.append({
            "symbol": symbol,
            "timeframe": row.get("timeframe"),
            "entryPrice": entry,
            "exitPrice": round(float(price), 6),
            "invalidationPrice": invalidation,
            "quality": row.get("quality"),
            "risk": "live_monitored",
            "patternContext": "live_monitored",
            "exitReason": exit_reason,
            "postExitReturns": {},
            "postExitMaxReturn": None,
            "notes": [
                "auto-generated from open-position monitor",
                f"closed_at_live_price={round(float(price), 6)}"
            ],
            "postExitDataQuality": "real",
        })

    write_json(TRADE_LOG_PATH, updated_trade_log)
    write_json(POST_EXIT_PATH, post_exit)
    write_json(LIVE_MARKET_PATH, {"updatedAt": now, "rows": market_rows})
    write_json(STATUS_PATH, {
        "updatedAt": now,
        "pollSeconds": POLL_SECONDS,
        "openPositions": open_count,
        "closeEvents": close_events,
        "status": "idle" if open_count == 0 else "monitoring",
    })

    return {"updatedAt": now, "openPositions": open_count, "closeEvents": close_events}


def main():
    while True:
        result = refresh_open_positions_once()
        print(json.dumps(result, ensure_ascii=False))
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
