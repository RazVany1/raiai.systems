import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(r"C:\Users\R\raiai.systems")
SCANNER = PROJECT_ROOT / "scripts" / "generate_rsi_trend_snapshot.py"
STATE_PATH = Path(r"D:\RAI_CRYPTO\60-paper-trading\rsi-top-vercel-deploy-budget-state.json")
DAILY_DEPLOY_CAP = 80
MIN_SECONDS_BETWEEN_DEPLOYS = 25 * 60
DATA_PATHS = [
    "public/data/rsi-trend-dashboard.json",
    "public/data/hl-lh-formation-state.json",
    "public/data/paper-entry-positions.json",
    "public/data/paper-entry-positions-history.json",
    "public/data/paper-position-snapshots.json",
    "public/data/rsi-interest-v3-state.json",
    "public/data/rsi-interest-1h-v3-state.json",
    "public/data/rsi-interest-1d-v3-state.json",
    "public/data/rsi-interest-state.json",
    "public/data/rsi-interest-1h-state.json",
    "public/data/rsi-interest-1d-state.json",
    "public/data/rsi-interest-v2-state.json",
    "public/data/rsi-interest-1h-v2-state.json",
    "public/data/rsi-interest-1d-v2-state.json",
    "public/data/rsi-interest-v0-state.json",
    "public/data/rsi-interest-1h-v0-state.json",
    "public/data/rsi-interest-1d-v0-state.json",
    "public/data/rsi-interest-zones-v0.json",
    "public/data/rsi-interest-zones-v2.json",
]


def load_json(path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def run(args, timeout=300):
    cmd = list(args)
    if cmd and cmd[0] == "npx":
        cmd[0] = shutil.which("npx") or shutil.which("npx.cmd") or "npx.cmd"
    return subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True, timeout=timeout)


def budget_available():
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    state = load_json(STATE_PATH, {"date": today, "count": 0, "lastDeployAt": None})
    if state.get("date") != today:
        state = {"date": today, "count": 0, "lastDeployAt": None}
    if int(state.get("count", 0)) >= DAILY_DEPLOY_CAP:
        return False, f"deploy cap reached {state.get('count')}/{DAILY_DEPLOY_CAP} today"
    last = state.get("lastDeployAt")
    if last:
        try:
            elapsed = (now - datetime.fromisoformat(last)).total_seconds()
            if elapsed < MIN_SECONDS_BETWEEN_DEPLOYS:
                return False, f"deploy throttled; last deploy {int(elapsed/60)}m ago"
        except Exception:
            pass
    return True, "deploy budget available"


def record_deploy():
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    state = load_json(STATE_PATH, {"date": today, "count": 0})
    if state.get("date") != today:
        state = {"date": today, "count": 0}
    state["count"] = int(state.get("count", 0)) + 1
    state["lastDeployAt"] = now.isoformat()
    save_json(STATE_PATH, state)


def deploy_url_from_output(text):
    urls = [line.strip() for line in text.splitlines() if line.strip().startswith("https://raiai-systems-") and line.strip().endswith(".vercel.app")]
    return urls[-1] if urls else None


def main():
    scan = run([sys.executable, str(SCANNER)], timeout=1800)
    if scan.returncode != 0:
        print("RSI TOP scan failed")
        print((scan.stderr or scan.stdout)[-2000:])
        return scan.returncode

    status = run(["git", "status", "--short", *DATA_PATHS], timeout=60)
    if status.returncode != 0:
        print("git status failed")
        print((status.stderr or status.stdout)[-1200:])
        return status.returncode
    if not status.stdout.strip():
        print("RSI TOP scan OK — no dashboard data changes, deploy skipped")
        return 0

    ok, reason = budget_available()
    if not ok:
        print(f"RSI TOP scan OK — data changed, deploy skipped: {reason}")
        return 0

    add = run(["git", "add", *DATA_PATHS], timeout=120)
    if add.returncode != 0:
        print("git add failed")
        print((add.stderr or add.stdout)[-1200:])
        return add.returncode

    commit = run(["git", "commit", "-m", "data: update RSI TOP crypto dashboard"], timeout=180)
    combined = (commit.stdout or "") + (commit.stderr or "")
    if commit.returncode != 0 and "nothing to commit" not in combined.lower():
        print("git commit failed")
        print(combined[-1600:])
        return commit.returncode

    deploy = run(["npx", "vercel", "--prod", "--yes"], timeout=900)
    deploy_text = (deploy.stdout or "") + (deploy.stderr or "")
    if deploy.returncode != 0:
        print("vercel deploy failed")
        print(deploy_text[-2000:])
        return deploy.returncode

    url = deploy_url_from_output(deploy_text)
    if url:
        for domain in ("raiai.systems", "www.raiai.systems"):
            alias = run(["npx", "vercel", "alias", "set", url, domain], timeout=240)
            if alias.returncode != 0:
                print(f"alias failed for {domain}")
                print(((alias.stdout or "") + (alias.stderr or ""))[-1200:])
                return alias.returncode

    push = run(["git", "push", "origin", "main"], timeout=240)
    if push.returncode != 0:
        print("git push failed after deploy")
        print((push.stderr or push.stdout)[-1600:])
        return push.returncode

    record_deploy()
    print("RSI TOP scan OK — deployed to Vercel and aliased to raiai.systems")
    print(f"URL: {url or 'https://raiai.systems/crypto'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
