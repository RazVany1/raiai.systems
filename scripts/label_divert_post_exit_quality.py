import json
from pathlib import Path

POST_EXIT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json")


def main():
    if not POST_EXIT_PATH.exists():
        return
    rows = json.loads(POST_EXIT_PATH.read_text(encoding="utf-8"))
    updated = []
    for row in rows:
        notes = list(row.get("notes", []))
        quality = "real"
        if any("auto-generated from close management layer" in str(n) for n in notes):
            quality = "estimated_live_proxy"
        row["postExitDataQuality"] = quality
        updated.append(row)
    POST_EXIT_PATH.write_text(json.dumps(updated, indent=2, ensure_ascii=False), encoding="utf-8")
    print(POST_EXIT_PATH)


if __name__ == "__main__":
    main()
