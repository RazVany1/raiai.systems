import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

LIVE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json")
TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")


def fetch_price(symbol: str):
    url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return float(data["price"])
    except Exception:
        return None


def load_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    live = load_json(LIVE_PATH) or {}
    trade_log = load_json(TRADE_LOG_PATH) or []

    rows = live.get("rows", [])
    symbols = sorted({row.get("symbol") for row in rows if row.get("symbol")})
    trade_map = {row.get("symbol"): row for row in trade_log if row.get("symbol")}

    out_rows = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for symbol in symbols:
        price = fetch_price(symbol)
        trade = trade_map.get(symbol, {})
        entry = trade.get("entryPrice")
        invalidation = trade.get("invalidationPrice")
        side = trade.get("side")
        pnl_pct = None
        dist_to_invalidation_pct = None

        if price is not None and entry is not None:
            raw = ((price - float(entry)) / float(entry)) * 100
            if side == "SELL":
                raw = -raw
            pnl_pct = round(raw, 2)

        if price is not None and invalidation is not None and invalidation != 0:
            if side == "SELL":
                dist = ((float(invalidation) - price) / price) * 100
            else:
                dist = ((price - float(invalidation)) / price) * 100
            dist_to_invalidation_pct = round(dist, 2)

        out_rows.append({
            "symbol": symbol,
            "livePrice": round(price, 6) if price is not None else None,
            "entryPrice": entry,
            "invalidationPrice": invalidation,
            "side": side,
            "livePnlPct": pnl_pct,
            "distanceToInvalidationPct": dist_to_invalidation_pct,
            "marketTimestamp": updated_at,
        })

    payload = {
        "updatedAt": updated_at,
        "rows": out_rows,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
