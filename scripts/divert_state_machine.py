import json
from pathlib import Path

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-state-machine.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def infer_state(row: dict):
    status = row.get("status")
    entry = row.get("entryPrice")
    closed = row.get("closedAt")
    if status == "watching":
        return "watchlist"
    if status == "open" and entry is not None:
        return "open_position"
    if status == "closed" and closed:
        return "learning"
    return "unknown"


def main():
    trade_log = load_json(TRADE_LOG_PATH, [])
    rows = []
    for row in trade_log:
        rows.append({
            "symbol": row.get("symbol"),
            "state": infer_state(row),
            "status": row.get("status"),
            "openedAt": row.get("openedAt"),
            "closedAt": row.get("closedAt"),
        })
    OUT_PATH.write_text(json.dumps({"rows": rows}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
