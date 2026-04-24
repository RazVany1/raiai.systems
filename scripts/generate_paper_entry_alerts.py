import json
import os
from datetime import datetime, timezone
from pathlib import Path
import urllib.request

DASHBOARD_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-trend-dashboard.json")
STATE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\paper-entry-alert-state.json")
ALERTS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\paper-entry-alerts.json")
DELIVERED_PATH = Path(r"C:\Users\R\raiai.systems\public\data\paper-entry-alerts-delivered.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def send_telegram_message(text: str) -> bool:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return False
    try:
        payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as response:
            return 200 <= response.status < 300
    except Exception:
        return False


def main():
    dashboard = load_json(DASHBOARD_PATH, {})
    state = load_json(STATE_PATH, {"active": {}})
    active = state.get("active", {}) if isinstance(state.get("active"), dict) else {}
    current_rows = dashboard.get("openPaperPositions", []) if isinstance(dashboard, dict) else []
    now_iso = datetime.now(timezone.utc).isoformat()

    current_active = {}
    alerts = []
    delivered = load_json(DELIVERED_PATH, {"sent": []})
    sent_keys = set(delivered.get("sent", [])) if isinstance(delivered.get("sent", []), list) else set()

    for row in current_rows:
        symbol = row.get("symbol")
        side = row.get("side")
        entry_at = row.get("entryAt")
        key = f"{symbol}:{side}:{entry_at}"
        current_active[key] = row

        if key not in active:
            entry_price = row.get("entryPrice")
            trend_direction = row.get("trendDirection")
            entry_state = row.get("entryState")
            invalidation = row.get("invalidationLevel")
            alert = {
                "symbol": symbol,
                "side": side,
                "type": "paper_entry_opened",
                "priority": "high",
                "entryPrice": entry_price,
                "entryAt": entry_at,
                "trendDirection": trend_direction,
                "entryState": entry_state,
                "invalidationLevel": invalidation,
                "message": f"{symbol} {side} paper entry opened at {entry_price}",
                "deliveryStatus": "telegram_ready",
                "chatDeliveryText": (
                    f"PAPER ENTRY ALERT\n"
                    f"{symbol} | {side}\n"
                    f"Entry: {entry_price}\n"
                    f"Entry time: {entry_at}\n"
                    f"Trend: {trend_direction}\n"
                    f"State: {entry_state}\n"
                    f"Invalidation: {invalidation}"
                ),
                "createdAt": now_iso,
            }
            if key not in sent_keys and send_telegram_message(alert["chatDeliveryText"]):
                alert["deliveryStatus"] = "telegram_sent"
                sent_keys.add(key)
            alerts.append(alert)

    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False), encoding="utf-8")
    STATE_PATH.write_text(json.dumps({"updatedAt": now_iso, "active": current_active}, indent=2, ensure_ascii=False), encoding="utf-8")
    DELIVERED_PATH.write_text(json.dumps({"updatedAt": now_iso, "sent": sorted(sent_keys)}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(ALERTS_PATH)


if __name__ == "__main__":
    main()
