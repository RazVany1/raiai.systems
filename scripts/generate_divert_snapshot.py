import json
import os
from datetime import datetime, timezone
from pathlib import Path
import sys

RUNTIME_PATH = Path(r"D:\RAI\rai_systems\runtime")
if str(RUNTIME_PATH) not in sys.path:
    sys.path.append(str(RUNTIME_PATH))

from rai_crypto_signal_output_layer_v0_3 import RAICryptoSignalOutputLayerV3  # type: ignore

SYMBOLS = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "TAOUSDT",
    "FETUSDT",
    "WLDUSDT",
    "HBARUSDT",
    "XLMUSDT",
    "ALGOUSDT",
    "FILUSDT",
    "AAVEUSDT",
    "APTUSDT",
    "CRVUSDT",
    "WIFUSDT",
    "ARBUSDT",
    "AVAXUSDT",
    "ADAUSDT",
]

OUTPUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json")
ARCHIVE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-history.json")
TRADE_LOG_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json")
ALERTS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-alerts.json")
MAX_HISTORY = 50


def normalize_row(row: dict) -> dict:
    signal = str(row.get("signal", "NO")).upper()
    raw_side = str(row.get("side", "none")).upper()
    side = raw_side if raw_side in {"BUY", "SELL", "LONG", "SHORT"} else ("LONG" if signal in {"YES", "WATCH"} else "NONE")
    quality = str(row.get("quality", "UNKNOWN")).upper()
    invalidation = row.get("invalidation")
    if invalidation is not None:
        invalidation = round(float(invalidation), 6)
    current_price = row.get("current_price")
    if current_price is not None:
        current_price = round(float(current_price), 6)
    notes = list(row.get("notes", []))
    if current_price is not None:
        notes.append(f"price_now={current_price}")
    execution = build_execution_plan(signal, side, invalidation)
    return {
        "symbol": row.get("symbol"),
        "signal": signal,
        "side": side,
        "quality": quality,
        "invalidation": invalidation,
        "notes": notes,
        "patternContext": row.get("pattern_context", "unknown"),
        "entryStructure": row.get("entry_structure", "unknown"),
        "risk": row.get("risk", "unknown"),
        "timeframe": row.get("timeframe", "4h"),
        "execution": execution,
    }


def build_execution_plan(signal: str, side: str, invalidation: float | None) -> dict:
    if signal == "YES":
        return {
            "status": "actionable",
            "entry": f"direct {side.lower()} execution on valid setup",
            "invalidation": invalidation,
            "exitTrigger": "take initial bounce / reaction, keep defensive exit active",
            "closeRule": "close on first reaction target or invalidation break",
        }
    if signal == "WATCH":
        return {
            "status": "watch",
            "entry": "wait for cleaner confirmation",
            "invalidation": invalidation,
            "exitTrigger": "no entry yet",
            "closeRule": "none",
        }
    if signal == "NEAR_SETUP":
        return {
            "status": "near",
            "entry": "wait for RSI threshold confirmation",
            "invalidation": invalidation,
            "exitTrigger": "no entry yet",
            "closeRule": "none",
        }
    return {
        "status": "none",
        "entry": "no action",
        "invalidation": invalidation,
        "exitTrigger": "none",
        "closeRule": "none",
    }


def load_history() -> list:
    if not ARCHIVE_PATH.exists():
        return []
    try:
        return json.loads(ARCHIVE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def load_json_list(path: Path) -> list:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def build_trade_log(rows: list[dict], updated_at: str) -> list[dict]:
    existing = load_json_list(TRADE_LOG_PATH)
    by_symbol = {row.get("symbol"): row for row in existing}
    result = []

    for row in rows:
        symbol = row.get("symbol")
        signal = row.get("signal")
        side = row.get("side")
        quality = row.get("quality")
        timeframe = row.get("timeframe")
        invalidation = row.get("invalidation")
        price_now = None
        for note in row.get("notes", []):
            if isinstance(note, str) and note.startswith("price_now="):
                try:
                    price_now = float(note.replace("price_now=", ""))
                except Exception:
                    price_now = None

        current = by_symbol.get(symbol)

        if signal == "YES" and price_now is not None:
            if current and current.get("status") == "closed":
                result.append(current)
                continue

            existing_entry = current.get("entryPrice") if current and current.get("entryPrice") is not None else price_now
            exit_trigger = None
            if existing_entry is not None:
                if side == "SELL":
                    exit_trigger = round(float(existing_entry) * 0.97, 6)
                else:
                    exit_trigger = round(float(existing_entry) * 1.03, 6)

            result.append({
                "symbol": symbol,
                "side": side,
                "timeframe": timeframe,
                "status": "open",
                "entryPrice": existing_entry,
                "invalidationPrice": invalidation,
                "exitPrice": None,
                "resultPct": None,
                "quality": quality,
                "openedAt": current.get("openedAt") if current and current.get("openedAt") else updated_at,
                "closedAt": None,
                "targetPrice": exit_trigger,
                "exitRule": "close on target or invalidation",
                "notes": [f"auto_managed", f"alert:entry_ready"],
            })
        elif signal in {"WATCH", "NEAR_SETUP"}:
            if current:
                result.append(current)
        elif current:
            if current.get("status") == "open" and price_now is not None and current.get("entryPrice") is not None:
                entry = float(current.get("entryPrice"))
                raw_result = ((price_now - entry) / entry) * 100
                if current.get("side") == "SELL":
                    raw_result = -raw_result

                should_close = False
                target_price = current.get("targetPrice")
                invalidation_price = current.get("invalidationPrice")
                side_now = current.get("side")

                if side_now == "SELL":
                    if target_price is not None and price_now <= float(target_price):
                        should_close = True
                    if invalidation_price is not None and price_now >= float(invalidation_price):
                        should_close = True
                else:
                    if target_price is not None and price_now >= float(target_price):
                        should_close = True
                    if invalidation_price is not None and price_now <= float(invalidation_price):
                        should_close = True

                if should_close:
                    result.append({
                        **current,
                        "status": "closed",
                        "exitPrice": round(price_now, 6),
                        "resultPct": round(raw_result, 2),
                        "closedAt": updated_at,
                        "notes": list(current.get("notes", [])) + ["alert:close_sent"],
                    })
                else:
                    result.append({
                        **current,
                        "resultPct": round(raw_result, 2),
                    })
            else:
                result.append(current)

    deduped = []
    seen = set()
    for row in result:
        symbol = row.get("symbol")
        if symbol in seen:
            continue
        seen.add(symbol)
        deduped.append(row)
    return deduped


def build_alerts(rows: list[dict], trade_log: list[dict], updated_at: str) -> list[dict]:
    alerts = []
    for row in rows:
        if row.get("signal") == "YES":
            alerts.append({
                "symbol": row.get("symbol"),
                "type": "setup",
                "priority": "high" if row.get("quality") == "GOOD" else "medium",
                "message": f"{row.get('signal')} {str(row.get('side', '')).lower()} setup active",
                "deliveryStatus": "dashboard_ready",
                "chatDeliveryText": f"CRYPTO ALERT: {row.get('symbol')} {str(row.get('side', '')).lower()} setup active",
                "createdAt": updated_at,
            })
    for trade in trade_log:
        if trade.get("status") == "open":
            alerts.append({
                "symbol": trade.get("symbol"),
                "type": "entry",
                "priority": "high",
                "message": f"{trade.get('side')} position active from trade log",
                "deliveryStatus": "dashboard_ready",
                "chatDeliveryText": f"CRYPTO ALERT: {trade.get('symbol')} entry active ({trade.get('side')})",
                "createdAt": updated_at,
            })
        elif trade.get("status") == "closed" and trade.get("closedAt") == updated_at:
            alerts.append({
                "symbol": trade.get("symbol"),
                "type": "close",
                "priority": "medium",
                "message": f"Trade closed at {trade.get('resultPct')}%",
                "deliveryStatus": "dashboard_ready",
                "chatDeliveryText": f"CRYPTO ALERT: {trade.get('symbol')} closed at {trade.get('resultPct')}%",
                "createdAt": updated_at,
            })
    return alerts[:12]


def main() -> None:
    layer = RAICryptoSignalOutputLayerV3(symbols=SYMBOLS)
    rows = [normalize_row(row) for row in layer.run()]
    updated_at = datetime.now(timezone.utc).isoformat()

    trade_log = build_trade_log(rows, updated_at)
    alerts = build_alerts(rows, trade_log, updated_at)

    snapshot = {
        "strategy": "DiverT Strategy",
        "updatedAt": updated_at,
        "rows": rows,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
    TRADE_LOG_PATH.write_text(json.dumps(trade_log, indent=2, ensure_ascii=False), encoding="utf-8")
    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False), encoding="utf-8")

    history = load_history()
    history.append({
        "updatedAt": updated_at,
        "summary": {
            "yes": sum(1 for row in rows if row["signal"] == "YES"),
            "watch": sum(1 for row in rows if row["signal"] == "WATCH"),
            "nearSetup": sum(1 for row in rows if row["signal"] == "NEAR_SETUP"),
            "no": sum(1 for row in rows if row["signal"] == "NO"),
        },
        "rows": rows,
    })
    history = history[-MAX_HISTORY:]
    ARCHIVE_PATH.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Snapshot updated: {OUTPUT_PATH}")
    print(f"History updated: {ARCHIVE_PATH}")
    print(f"Trade log updated: {TRADE_LOG_PATH}")
    print(f"Alerts updated: {ALERTS_PATH}")


if __name__ == "__main__":
    main()
