import json
import os
from datetime import datetime, timezone
from pathlib import Path
import sys

RUNTIME_PATH = Path(r"D:\RAI\rai_systems\runtime")
if str(RUNTIME_PATH) not in sys.path:
    sys.path.append(str(RUNTIME_PATH))

from rai_crypto_signal_output_layer_v0_1 import RAICryptoSignalOutputLayerV1  # type: ignore

OUTPUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json")
ARCHIVE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-history.json")
MAX_HISTORY = 50


def normalize_row(row: dict) -> dict:
    signal = str(row.get("signal", "NO")).upper()
    side = "LONG" if signal in {"YES", "WATCH"} else "NONE"
    quality = str(row.get("quality", "UNKNOWN")).upper()
    invalidation = row.get("invalidation")
    if invalidation is not None:
        invalidation = round(float(invalidation), 6)
    return {
        "symbol": row.get("symbol"),
        "signal": signal,
        "side": side,
        "quality": quality,
        "invalidation": invalidation,
        "notes": row.get("notes", []),
        "patternContext": row.get("pattern_context", "unknown"),
        "entryStructure": row.get("entry_structure", "unknown"),
        "risk": row.get("risk", "unknown"),
        "timeframe": row.get("timeframe", "4h"),
    }


def load_history() -> list:
    if not ARCHIVE_PATH.exists():
        return []
    try:
        return json.loads(ARCHIVE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def main() -> None:
    layer = RAICryptoSignalOutputLayerV1()
    rows = [normalize_row(row) for row in layer.run()]
    updated_at = datetime.now(timezone.utc).isoformat()

    snapshot = {
        "strategy": "DiverT Strategy",
        "updatedAt": updated_at,
        "rows": rows,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")

    history = load_history()
    history.append({
        "updatedAt": updated_at,
        "summary": {
            "yes": sum(1 for row in rows if row["signal"] == "YES"),
            "watch": sum(1 for row in rows if row["signal"] == "WATCH"),
            "no": sum(1 for row in rows if row["signal"] == "NO"),
        },
        "rows": rows,
    })
    history = history[-MAX_HISTORY:]
    ARCHIVE_PATH.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Snapshot updated: {OUTPUT_PATH}")
    print(f"History updated: {ARCHIVE_PATH}")


if __name__ == "__main__":
    main()
