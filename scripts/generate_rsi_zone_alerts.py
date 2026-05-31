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


def display_value(value):
    return "-" if value is None else value


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
            "price": row.get("price"),
            "detectedAt": row.get("detectedAt"),
            "firstDetectedAt": row.get("firstDetectedAt"),
            "lastSeenAt": row.get("lastSeenAt"),
            "anchorRsi": row.get("anchorRsi"),
            "anchorTime": row.get("anchorTime"),
            "previousRsi": row.get("previousRsi"),
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
        for field in ["rsi", "price", "detectedAt", "firstDetectedAt", "lastSeenAt", "anchorRsi", "anchorTime", "previousRsi"]:
            if row.get(field) is not None:
                existing[field] = row.get(field)
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
    state = load_json(STATE_PATH, {"active": {}, "lastSent": {}})
    active = state.get("active", {}) if isinstance(state.get("active"), dict) else {}
    last_sent = state.get("lastSent", {}) if isinstance(state.get("lastSent"), dict) else {}
    v0_rows = v0_data.get("interestRows", []) if isinstance(v0_data, dict) else []
    v1_rows = dashboard.get("interestRows", []) if isinstance(dashboard, dict) else []
    v2_rows = v2_data.get("interestRows", []) if isinstance(v2_data, dict) else []
    now_iso = datetime.now(timezone.utc).isoformat()

    version_matrix = build_version_matrix(v0_rows, v1_rows, v2_rows)

    current_active = {}
    alerts = []
    delivered = load_json(DELIVERED_PATH, {"sent": [], "history": []})
    sent_keys = set(delivered.get("sent", [])) if isinstance(delivered.get("sent", []), list) else set()
    history = delivered.get("history", []) if isinstance(delivered.get("history"), list) else []

    for key, row in version_matrix.items():
        if not (row.get("v1") and row.get("v2")):
            continue

        symbol = row.get("symbol")
        zone = row.get("zone")
        detected_at = row.get("detectedAt") or row.get("firstDetectedAt")
        rsi = row.get("rsi")
        anchor_time = row.get("anchorTime")
        last_seen_at = row.get("lastSeenAt")
        price = row.get("price")
        instance_key = f"{symbol}:{zone}:{detected_at}"

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
            "lastSeenAt": last_seen_at,
            "rsi": rsi,
            "price": price,
            "instanceKey": instance_key,
            "source": "dashboard_matrix_v1_v2",
        }

        already_sent_for_instance = instance_key in sent_keys
        was_same_instance_active = bool(active.get(key)) and active.get(key, {}).get("instanceKey") == instance_key
        needs_send = not already_sent_for_instance and (not was_same_instance_active or last_sent.get(key) != instance_key)

        alert = {
            "symbol": symbol,
            "type": "rsi_zone_entered",
            "priority": "medium",
            "zone": zone,
            "rsi": rsi,
            "price": price,
            "detectedAt": detected_at,
            "lastSeenAt": last_seen_at,
            "v1": True,
            "v2": True,
            "v1Active": bool(row.get("v1Active")),
            "v2Active": bool(row.get("v2Active")),
            "instanceKey": instance_key,
            "message": f"{symbol} qualifies for V1+V2 in {zone} at RSI {rsi}",
            "deliveryStatus": "telegram_sent" if already_sent_for_instance else "telegram_ready",
            "chatDeliveryText": (
                f"RSI V1+V2 ALERT\n"
                f"{symbol} | {zone}\n"
                f"RSI: {display_value(rsi)}\n"
                f"Price: {display_value(price)}\n"
                f"Detected: {display_value(detected_at)}\n"
                f"Last seen: {display_value(last_seen_at)}\n"
                f"V1 active: {'yes' if row.get('v1Active') else 'no'} | V2 active: {'yes' if row.get('v2Active') else 'no'}"
            ),
            "createdAt": now_iso,
            "source": "dashboard_matrix_v1_v2",
        }

        if needs_send and send_telegram_message(alert["chatDeliveryText"]):
            alert["deliveryStatus"] = "telegram_sent"
            sent_keys.add(instance_key)
            last_sent[key] = instance_key
            history.append({
                "instanceKey": instance_key,
                "symbol": symbol,
                "zone": zone,
                "detectedAt": detected_at,
                "sentAt": now_iso,
            })
        elif needs_send:
            alert["deliveryStatus"] = "telegram_failed"

        alerts.append(alert)

    ALERTS_PATH.write_text(json.dumps(alerts, indent=2, ensure_ascii=False), encoding="utf-8")
    STATE_PATH.write_text(json.dumps({"updatedAt": now_iso, "active": current_active, "lastSent": last_sent}, indent=2, ensure_ascii=False), encoding="utf-8")
    DELIVERED_PATH.write_text(json.dumps({"updatedAt": now_iso, "sent": sorted(sent_keys), "history": history[-500:]}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(ALERTS_PATH)


if __name__ == "__main__":
    main()
