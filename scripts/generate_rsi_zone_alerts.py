import json
from datetime import datetime, timezone
from pathlib import Path

DASHBOARD_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-trend-dashboard.json")
STATE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-zone-alert-state.json")
ALERTS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-zone-alerts.json")


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def main():
    dashboard = load_json(DASHBOARD_PATH, {})
    state = load_json(STATE_PATH, {"active": {}})
    active = state.get("active", {}) if isinstance(state.get("active"), dict) else {}
    current_rows = dashboard.get("interestRows", []) if isinstance(dashboard, dict) else []
    now_iso = datetime.now(timezone.utc).isoformat()

    current_active = {}
    alerts = []

    for row in current_rows:
        symbol = row.get("symbol")
        zone = row.get("zone")
        detected_at = row.get("detectedAt")
        rsi = row.get("rsi")
        key = f"{symbol}:{zone}"
        current_active[key] = {
            "symbol": symbol,
            "zone": zone,
            "detectedAt": detected_at,
            "rsi": rsi,
        }

        if key not in active:
            alerts.append({
                "symbol": symbol,
                "type": "rsi_zone_entered",
                "priority": "medium",
                "zone": zone,
                "rsi": rsi,
                "message": f"{symbol} entered {zone} zone at RSI {rsi}",
                "deliveryStatus": "telegram_ready",
                "chatDeliveryText": f"RSI ZONE ALERT: {symbol} entered {zone} on 4H, RSI={rsi}",
                "createdAt": now_iso,
            })

    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False), encoding="utf-8")
    STATE_PATH.write_text(json.dumps({"updatedAt": now_iso, "active": current_active}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(ALERTS_PATH)


if __name__ == "__main__":
    main()
