import json
from pathlib import Path

ALERTS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-alerts.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    alerts = load_json(ALERTS_PATH, [])
    live_market = load_json(LIVE_MARKET_PATH, {"rows": []})
    trade_log = load_json(TRADE_LOG_PATH, [])
    open_symbols = {row.get("symbol") for row in trade_log if row.get("status") == "open"}

    for row in live_market.get("rows", []):
        symbol = row.get("symbol")
        dist = row.get("distanceToInvalidationPct")
        if symbol in open_symbols and dist is not None and dist < 3:
            alerts.insert(0, {
                "symbol": symbol,
                "type": "risk",
                "priority": "high",
                "message": f"Near invalidation: {dist}%",
                "deliveryStatus": "dashboard_ready",
                "chatDeliveryText": f"CRYPTO ALERT: {symbol} near invalidation ({dist}%)",
                "createdAt": row.get("marketTimestamp"),
            })

    dedup = []
    seen = set()
    for a in alerts:
        key = (a.get("symbol"), a.get("type"), a.get("message"))
        if key in seen:
            continue
        seen.add(key)
        dedup.append(a)

    ALERTS_PATH.write_text(json.dumps(dedup[:20], indent=2, ensure_ascii=False), encoding="utf-8")
    print(ALERTS_PATH)


if __name__ == "__main__":
    main()
