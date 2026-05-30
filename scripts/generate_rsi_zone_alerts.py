import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
import urllib.request

RSI_LOOKBACK_BARS = 50
RSI_BAR_HOURS = 4
RSI_LOOKBACK_WINDOW = timedelta(hours=RSI_LOOKBACK_BARS * RSI_BAR_HOURS)

DASHBOARD_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-trend-dashboard.json")
V0_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-interest-zones-v0.json")
V2_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-interest-zones-v2.json")
STATE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-zone-alert-state.json")
ALERTS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-zone-alerts.json")
DELIVERED_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-zone-alerts-delivered.json")


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


def build_version_matrix(v0_rows: list, v1_rows: list, v2_rows: list) -> dict[str, dict]:
    matrix: dict[str, dict] = {}

    def upsert(row: dict, version: str):
        if not isinstance(row, dict):
            return
        symbol = row.get("symbol")
        zone = row.get("zone")
        if not symbol or not zone:
            return
        key = f"{symbol}:{zone}"
        existing = matrix.get(key, {
            "key": key,
            "symbol": symbol,
            "zone": zone,
            "rsi": row.get("rsi"),
            "detectedAt": row.get("detectedAt"),
            "anchorTime": row.get("anchorTime"),
            "v0": False,
            "v1": False,
            "v2": False,
            "v0Active": False,
            "v1Active": False,
            "v2Active": False,
        })
        existing[version] = True
        if version in {"v1", "v2"}:
            existing["v0"] = True
        existing["rsi"] = row.get("rsi")
        existing["detectedAt"] = row.get("detectedAt")
        if row.get("anchorTime") is not None:
            existing["anchorTime"] = row.get("anchorTime")
        existing[f"{version}Active"] = bool(row.get("currentlyInZone"))
        matrix[key] = existing

    for row in v0_rows:
        upsert(row, "v0")
    for row in v1_rows:
        upsert(row, "v1")
    for row in v2_rows:
        upsert(row, "v2")
    return matrix


def main():
    dashboard = load_json(DASHBOARD_PATH, {})
    v0_data = load_json(V0_PATH, {})
    v2_data = load_json(V2_PATH, {})
    state = load_json(STATE_PATH, {"active": {}})
    active = state.get("active", {}) if isinstance(state.get("active"), dict) else {}
    v0_rows = v0_data.get("interestRows", []) if isinstance(v0_data, dict) else []
    v1_rows = dashboard.get("interestRows", []) if isinstance(dashboard, dict) else []
    v2_rows = v2_data.get("interestRows", []) if isinstance(v2_data, dict) else []
    now_iso = datetime.now(timezone.utc).isoformat()

    version_matrix = build_version_matrix(v0_rows, v1_rows, v2_rows)

    current_active = {}
    alerts = []
    delivered = load_json(DELIVERED_PATH, {"sent": []})
    sent_keys = set(delivered.get("sent", [])) if isinstance(delivered.get("sent", []), list) else set()

    for key, row in version_matrix.items():
        if not (row.get("v1") and row.get("v2") and row.get("v1Active") and row.get("v2Active")):
            continue

        symbol = row.get("symbol")
        zone = row.get("zone")
        detected_at = row.get("detectedAt")
        rsi = row.get("rsi")
        anchor_time = row.get("anchorTime")

        if zone in {"upper_interest", "lower_interest"}:
            if not anchor_time:
                continue
            try:
                anchor_dt = datetime.fromisoformat(anchor_time)
            except Exception:
                continue
            if (datetime.now(timezone.utc) - anchor_dt) > RSI_LOOKBACK_WINDOW:
                continue

        current_active[key] = {
            "symbol": symbol,
            "zone": zone,
            "detectedAt": detected_at,
            "rsi": rsi,
            "source": "dashboard_matrix_v1_v2",
        }

        if key not in active:
            alert = {
                "symbol": symbol,
                "type": "rsi_zone_entered",
                "priority": "medium",
                "zone": zone,
                "rsi": rsi,
                "message": f"{symbol} entered {zone} zone at RSI {rsi} and qualifies for V1+V2",
                "deliveryStatus": "telegram_ready",
                "chatDeliveryText": f"RSI ZONE ALERT: {symbol} entered {zone} on 4H, RSI={rsi} | qualifies V1+V2",
                "createdAt": now_iso,
                "source": "dashboard_matrix_v1_v2",
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
