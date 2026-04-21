import json
from pathlib import Path

FILES = {
    "live": Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json"),
    "liveMarket": Path(r"C:\Users\R\raiai.systems\public\data\divert-live-market.json"),
    "tradeLog": Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json"),
    "positionTracker": Path(r"C:\Users\R\raiai.systems\public\data\divert-position-tracker.json"),
    "postExit": Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json"),
    "alerts": Path(r"C:\Users\R\raiai.systems\public\data\divert-alerts.json"),
    "stateMachine": Path(r"C:\Users\R\raiai.systems\public\data\divert-state-machine.json"),
}
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-validation.json")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def main():
    report = {"status": "ok", "checks": []}
    data = {k: load_json(v) for k, v in FILES.items()}

    for key, value in data.items():
        report["checks"].append({
            "name": f"file_exists:{key}",
            "ok": value is not None,
        })

    trade_symbols = {row.get("symbol") for row in (data.get("tradeLog") or [])}
    pos_symbols = {row.get("symbol") for row in (data.get("positionTracker") or [])}
    report["checks"].append({
        "name": "trade_vs_position_symbols",
        "ok": trade_symbols == pos_symbols,
        "tradeCount": len(trade_symbols),
        "positionCount": len(pos_symbols),
    })

    live_symbols = {row.get("symbol") for row in ((data.get("liveMarket") or {}).get("rows", []))}
    report["checks"].append({
        "name": "open_symbols_have_live_market",
        "ok": all(symbol in live_symbols for symbol in trade_symbols if symbol),
    })

    report["status"] = "ok" if all(c.get("ok") for c in report["checks"]) else "warning"
    OUT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
