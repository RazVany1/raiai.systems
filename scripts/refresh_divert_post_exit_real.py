import json
from pathlib import Path
import sys

RUNTIME_PATH = Path(r"D:\RAI\rai_systems\runtime")
if str(RUNTIME_PATH) not in sys.path:
    sys.path.append(str(RUNTIME_PATH))

from rai_crypto_post_exit_tracker_v0_1 import RAICryptoPostExitTrackerV1  # type: ignore

TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
POST_EXIT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    trade_log = load_json(TRADE_LOG_PATH, [])
    existing = load_json(POST_EXIT_PATH, [])
    tracker = RAICryptoPostExitTrackerV1()

    preserved = []
    for item in existing:
        if item.get("postExitDataQuality") == "real":
            preserved.append(item)

    updated = list(preserved)
    for row in trade_log:
        if row.get("status") != "closed":
            continue
        symbol = row.get("symbol")
        exit_price = row.get("exitPrice")
        already_real = any(
            x.get("symbol") == symbol and x.get("exitPrice") == exit_price and x.get("postExitDataQuality") == "real"
            for x in updated
        )
        if already_real:
            continue
        try:
            rec = tracker.build_post_exit_record(
                symbol=symbol,
                timeframe=row.get("timeframe") or "4h",
                entry_price=float(row.get("entryPrice")),
                exit_price=float(exit_price),
                invalidation_price=float(row.get("invalidationPrice")),
                quality=str(row.get("quality") or "unknown"),
                risk="live_managed",
                pattern_context="live_managed",
                exit_reason="initial_bounce_capture" if "initial_bounce_capture" in " ".join(row.get("notes", [])) else "managed_close",
            )
            payload = {
                "symbol": rec.symbol,
                "timeframe": rec.timeframe,
                "entryPrice": rec.entry_price,
                "exitPrice": rec.exit_price,
                "invalidationPrice": rec.invalidation_price,
                "quality": rec.quality,
                "risk": rec.risk,
                "patternContext": rec.pattern_context,
                "exitReason": rec.exit_reason,
                "postExitReturns": rec.post_exit_returns,
                "postExitMaxReturn": rec.post_exit_max_return,
                "notes": rec.notes,
                "postExitDataQuality": "real",
            }
            updated.append(payload)
        except Exception:
            fallback = next((x for x in existing if x.get("symbol") == symbol and x.get("exitPrice") == exit_price), None)
            if fallback:
                updated.append(fallback)

    POST_EXIT_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    print(POST_EXIT_PATH)


if __name__ == "__main__":
    main()
