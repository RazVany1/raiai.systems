import json
from pathlib import Path

LIVE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json")
TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-operational-semantics.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    live = load_json(LIVE_PATH, {"rows": []})
    trade = load_json(TRADE_LOG_PATH, [])
    live_market = load_json(LIVE_MARKET_PATH, {"rows": []})
    signal_symbols = {row.get("symbol") for row in live.get("rows", [])}
    trade_symbols = {row.get("symbol") for row in trade}
    market_symbols = {row.get("symbol") for row in live_market.get("rows", [])}

    payload = {
        "signalsCoveredByMarket": sorted(signal_symbols.issubset(market_symbols) and signal_symbols or []),
        "tradeCoveredByMarket": sorted(trade_symbols.issubset(market_symbols) and trade_symbols or []),
        "warnings": [],
    }

    if not signal_symbols.issubset(market_symbols):
        payload["warnings"].append("Some live signal symbols missing from live market layer")
    if not trade_symbols.issubset(market_symbols):
        payload["warnings"].append("Some trade log symbols missing from live market layer")

    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
