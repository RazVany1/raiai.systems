import json
from pathlib import Path

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
OUT_PATH = TRADE_LOG_PATH


def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    trade_log = load_json(TRADE_LOG_PATH) or []
    live_market = load_json(LIVE_MARKET_PATH) or {"rows": []}
    market_map = {row.get("symbol"): row for row in live_market.get("rows", [])}

    updated = []
    for row in trade_log:
        symbol = row.get("symbol")
        market = market_map.get(symbol, {})
        if row.get("status") == "open":
            live_pnl = market.get("livePnlPct")
            live_price = market.get("livePrice")
            dist_inv = market.get("distanceToInvalidationPct")
            notes = list(row.get("notes", []))
            notes = [n for n in notes if not str(n).startswith("live:")]
            if live_price is not None:
                notes.append(f"live:price={live_price}")
            if live_pnl is not None:
                notes.append(f"live:pnlPct={live_pnl}")
            if dist_inv is not None:
                notes.append(f"live:distanceToInvalidationPct={dist_inv}")
            updated.append({
                **row,
                "resultPct": live_pnl,
                "notes": notes,
            })
        else:
            updated.append(row)

    OUT_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
