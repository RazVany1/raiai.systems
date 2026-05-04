from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from typing import Any

LOCAL_BASE = Path(r"D:\RAI\rai_systems")
PUBLIC_BASE = Path(r"C:\Users\R\raiai.systems")

DAILY_DB = LOCAL_BASE / "memory" / "mr_fit_daily_entries_v0_1.json"
WEEKLY_DB = LOCAL_BASE / "memory" / "mr_fit_weekly_reviews_v0_1.json"
DAILY_LATEST = LOCAL_BASE / "status" / "mr_fit_daily_latest_v0_1.json"
WEEKLY_LATEST = LOCAL_BASE / "status" / "mr_fit_weekly_latest_v0_1.json"
OUTPUT = PUBLIC_BASE / "public" / "data" / "mr-fit-dashboard.json"


def load_json(path: Path, default: Any):
    if not path.exists():
        return default
    raw = path.read_text(encoding="utf-8-sig").strip()
    if not raw:
        return default
    return json.loads(raw)


def avg(values: list[Any]):
    cleaned = [v for v in values if isinstance(v, (int, float))]
    if not cleaned:
        return None
    return round(mean(cleaned), 2)


def verdict_class(value: str) -> str:
    text = (value or "").lower()
    if "prud" in text:
        return "prudence"
    if "pe directie" in text or "buna" in text:
        return "good"
    if "mixta" in text or "usor" in text:
        return "mixed"
    if "slaba" in text or "deviat" in text:
        return "bad"
    return "neutral"


def main() -> None:
    daily_entries = load_json(DAILY_DB, [])
    weekly_reviews = load_json(WEEKLY_DB, [])
    daily_latest = load_json(DAILY_LATEST, {})
    weekly_latest = load_json(WEEKLY_LATEST, {})

    last7 = daily_entries[-7:]
    summary = {
        "latestWeight": daily_latest.get("weight"),
        "entriesCount": len(daily_entries),
        "currentVerdict": daily_latest.get("verdict", "fara date"),
        "currentVerdictClass": verdict_class(daily_latest.get("verdict", "")),
        "weeklyVerdict": weekly_latest.get("verdict", "fara review"),
        "weeklyVerdictClass": verdict_class(weekly_latest.get("verdict", "")),
        "avgSleep": avg([row.get("sleep") for row in last7]),
        "avgEnergy": avg([row.get("energy") for row in last7]),
    }

    compliance_rows = [
        {"label": "Zile cu dulce zero (ultimele 7)", "value": f"{sum(1 for row in last7 if row.get('sweet_zero') is True)}/7"},
        {"label": "Zile fara mancat dupa 20:00", "value": f"{sum(1 for row in last7 if row.get('meal_before_20') is True)}/7"},
        {"label": "Zile cu sala", "value": f"{sum(1 for row in last7 if row.get('gym') is True)}/7"},
        {"label": "Zile cu cardio", "value": f"{sum(1 for row in last7 if row.get('cardio') is True)}/7"},
        {"label": "Somn mediu", "value": summary['avgSleep'] if summary['avgSleep'] is not None else "-"},
        {"label": "Energie medie", "value": summary['avgEnergy'] if summary['avgEnergy'] is not None else "-"},
    ]

    trend_rows = list(reversed([
        {
            "date": row.get("date"),
            "weight": row.get("weight"),
            "sleep": row.get("sleep"),
            "energy": row.get("energy"),
            "steps": row.get("steps"),
            "sweetZero": "da" if row.get("sweet_zero") is True else "nu" if row.get("sweet_zero") is False else "-",
            "mealBefore20": "da" if row.get("meal_before_20") is True else "nu" if row.get("meal_before_20") is False else "-",
            "gym": "da" if row.get("gym") is True else "nu" if row.get("gym") is False else "-",
            "cardio": "da" if row.get("cardio") is True else "nu" if row.get("cardio") is False else "-",
            "symptoms": row.get("symptoms") or "-",
        }
        for row in daily_entries[-14:]
    ]))

    payload = {
        "updatedAt": weekly_latest.get("generated_at") or daily_latest.get("logged_at") or None,
        "mission": {
            "destination": "talie mai mica, control alimentar real, progres sigur si consistenta pe termen lung",
            "mode": "fundamentals first, fara haos si fara biohacks ca baza",
            "startDate": "2026-05-05",
        },
        "summary": summary,
        "focus": {
            "todayConclusion": daily_latest.get("conclusion", "Nu exista inca date zilnice."),
            "todayPriority": daily_latest.get("priority_for_tomorrow", "Colecteaza primele date."),
            "weekConclusion": weekly_latest.get("conclusion", "Nu exista inca review saptamanal."),
            "weekPriority": weekly_latest.get("priority_next_week", "Porneste check-in-urile zilnice."),
            "blocker": weekly_latest.get("blocker", "nedeterminat"),
        },
        "complianceRows": compliance_rows,
        "trendRows": trend_rows,
        "weeklyRows": list(reversed(weekly_reviews[-8:])),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(str(OUTPUT))


if __name__ == "__main__":
    main()
