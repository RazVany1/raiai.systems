import json
from pathlib import Path

LIVE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-live.json")
OUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-backcheck.json")


def score_row(row: dict) -> dict:
    signal = row.get("signal")
    quality = row.get("quality")
    context = row.get("patternContext")
    risk = row.get("risk")

    score = 0
    if signal == "YES":
        score += 3
    elif signal == "WATCH":
        score += 1

    if quality == "GOOD":
        score += 2
    elif quality == "MEDIUM":
        score += 1

    if context == "positive":
        score += 1
    elif context == "negative":
        score -= 1

    if risk == "medium_high":
        score -= 1

    verdict = "keep"
    if score <= 1:
        verdict = "weak"
    elif score >= 5:
        verdict = "strong"

    return {
        "symbol": row.get("symbol"),
        "signal": signal,
        "quality": quality,
        "risk": risk,
        "patternContext": context,
        "score": score,
        "verdict": verdict,
    }


def main() -> None:
    live = json.loads(LIVE_PATH.read_text(encoding="utf-8"))
    rows = live.get("rows", [])
    out = {
        "updatedAt": live.get("updatedAt"),
        "results": [score_row(row) for row in rows],
    }
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Backcheck updated: {OUT_PATH}")


if __name__ == "__main__":
    main()
