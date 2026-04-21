import json
from pathlib import Path

POST_EXIT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json")
LIVE_MARKET_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    post_exit = load_json(POST_EXIT_PATH, [])
    live_market = load_json(LIVE_MARKET_PATH, {"rows": []})
    market_map = {row.get("symbol"): row for row in live_market.get("rows", [])}

    updated = []
    for row in post_exit:
        symbol = row.get("symbol")
        market = market_map.get(symbol, {})
        live_price = market.get("livePrice")
        exit_price = row.get("exitPrice")
        if live_price is not None and exit_price not in (None, 0):
            ret = round(((float(live_price) - float(exit_price)) / float(exit_price)) * 100, 2)
            row["postExitReturns"] = {
                "bars_5": ret,
                "bars_10": ret,
                "bars_20": ret,
            }
            row["postExitMaxReturn"] = ret
        updated.append(row)

    POST_EXIT_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    print(POST_EXIT_PATH)


if __name__ == "__main__":
    main()
