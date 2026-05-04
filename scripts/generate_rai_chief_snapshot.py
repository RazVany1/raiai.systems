from __future__ import annotations

import json
from pathlib import Path
from typing import Any

LOCAL_STATUS = Path(r"D:\RAI\rai_systems\status\rai_chief_runtime_v0_2_results.json")
PUBLIC_OUTPUT = Path(r"C:\Users\R\raiai.systems\public\data\rai-chief-board.json")


def load_json(path: Path, default: Any):
    if not path.exists():
        return default
    raw = path.read_text(encoding="utf-8-sig").strip()
    if not raw:
        return default
    return json.loads(raw)


def main() -> None:
    data = load_json(LOCAL_STATUS, {})
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(str(PUBLIC_OUTPUT))


if __name__ == "__main__":
    main()
