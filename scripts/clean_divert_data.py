import json
from pathlib import Path

FILES = [
    Path(r"C:\Users\R\raiai.systems\public\data\divert-alerts.json"),
    Path(r"C:\Users\R\raiai.systems\public\data\divert-trade-log.json"),
    Path(r"C:\Users\R\raiai.systems\public\data\divert-position-tracker.json"),
    Path(r"C:\Users\R\raiai.systems\public\data\divert-post-exit.json"),
]


def dedup_list(rows):
    out = []
    seen = set()
    for row in rows:
        key = json.dumps(row, sort_keys=True, ensure_ascii=False)
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def main():
    for path in FILES:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            data = dedup_list(data)
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            print(path)


if __name__ == "__main__":
    main()
