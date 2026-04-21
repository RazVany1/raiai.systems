import json
from pathlib import Path

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-position-tracker.json")


def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    trade_log = load_json(TRADE_LOG_PATH) or []
    live_market = load_json(LIVE_MARKET_PATH) or {"rows": []}
    market_map = {row.get("symbol"): row for row in live_market.get("rows", [])}

    out = []
    for row in trade_log:
        symbol = row.get("symbol")
        market = market_map.get(symbol, {})
        status = row.get("status")
        entry = row.get("entryPrice")
        exit_price = row.get("exitPrice")
        current_price = market.get("livePrice")
        side = row.get("side")
        pnl = row.get("resultPct")

        if status == "closed":
            current_price = exit_price
            pnl = row.get("resultPct")
            normalized_status = "closed_green" if (pnl or 0) >= 0 else "closed_red"
        elif status == "open":
            pnl = market.get("livePnlPct")
            normalized_status = "open_green" if (pnl or 0) >= 0 else "open_red"
        elif status == "watching":
            normalized_status = "waiting"
        else:
            normalized_status = status or "unknown"

        out.append({
            "symbol": symbol,
            "side": side,
            "timeframe": row.get("timeframe"),
            "entryPrice": entry,
            "currentPrice": current_price,
            "exitPrice": exit_price,
            "pnlPct": pnl,
            "status": normalized_status,
            "openedAt": row.get("openedAt"),
            "closedAt": row.get("closedAt"),
            "invalidationPrice": row.get("invalidationPrice"),
        })

    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
