"use client";

import { useEffect, useMemo, useState } from "react";

type SignalRow = {
  symbol: string;
  signal: string;
  side: string;
  quality: string;
  invalidation: number | null;
  notes: string[];
  patternContext?: string;
  entryStructure?: string;
  risk?: string;
  timeframe?: string;
};

type HistoryEntry = {
  updatedAt: string;
  summary: {
    yes: number;
    watch: number;
    no: number;
  };
  rows?: SignalRow[];
};

function signalBadgeClasses(signal: string) {
  if (signal === "YES") return "border-emerald-300/60 bg-emerald-400/15 text-emerald-100";
  if (signal === "WATCH") return "border-amber-300/60 bg-amber-400/15 text-amber-100";
  return "border-slate-300/20 bg-slate-200/5 text-slate-200";
}

function contextText(patternContext?: string) {
  if (patternContext === "positive") return "positive";
  if (patternContext === "negative") return "negative";
  return "neutral";
}

const shellClass = "rounded-2xl border border-slate-200/10 bg-slate-900/55 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm";

export default function CryptoDashboardPage() {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/divert", { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
      setHistory(data.history || []);
      setUpdatedAt(data.updatedAt || "");
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const yesSignals = rows.filter((row) => row.signal === "YES").length;
    const watchSignals = rows.filter((row) => row.signal === "WATCH").length;
    const longBias = rows.filter((row) => row.side === "LONG").length;
    const shortBias = rows.filter((row) => row.side === "SHORT").length;
    return { yesSignals, watchSignals, longBias, shortBias };
  }, [rows]);

  const topYes = rows.filter((row) => row.signal === "YES");
  const topWatch = rows.filter((row) => row.signal === "WATCH");
  const topSignalText = topYes.length > 0
    ? `YES active: ${topYes.map((row) => row.symbol).join(", ")}`
    : topWatch.length > 0
      ? `WATCH active: ${topWatch.map((row) => row.symbol).join(", ")}`
      : "No active DiverT signal right now";

  const signalCandidates = rows.filter((row) => row.signal === "YES" || row.signal === "WATCH");
  const noSignalRows = rows.filter((row) => row.signal === "NO");
  const recentHistory = history.slice(-8).reverse();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(180deg,_#0b1220_0%,_#111827_100%)] px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-semibold tracking-tight text-slate-50">
              RAI Crypto Dashboard
            </h1>
            <p className="text-base text-slate-300">DiverT Strategy live board</p>
          </div>
          <div className="text-sm leading-6 text-slate-300">
            <p>Status: dashboard v0.7</p>
            <p>Page refresh: 30s</p>
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <section className={`${shellClass} mb-8`}>
          <h2 className="mb-2 text-xl font-semibold text-slate-100">Top Signal</h2>
          <p className="text-sm leading-6 text-slate-300">{topSignalText}</p>
        </section>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">DiverT Strategy</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Price LL</li>
              <li>RSI HL</li>
              <li>RSI low 2 &gt; 30</li>
              <li>Bounce capture logic</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">Signal Stats</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>YES: {stats.yesSignals}</li>
              <li>WATCH: {stats.watchSignals}</li>
              <li>Long bias: {stats.longBias}</li>
              <li>Short bias: {stats.shortBias}</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">Feed Engine</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Source: precomputed JSON</li>
              <li>Scanner: local generator</li>
              <li>Archive: enabled</li>
              <li>Runtime-safe for Vercel</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-slate-100">Next</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Schedule feed generation</li>
              <li>Add post-exit tracking</li>
              <li>Add richer archive view</li>
              <li>Expand watch universe</li>
            </ul>
          </section>
        </div>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-50">Signal Candidates</h2>
              <span className="text-sm text-emerald-100/90">YES / WATCH focus</span>
            </div>
            {signalCandidates.length === 0 ? (
              <p className="text-sm leading-6 text-slate-300">No active YES or WATCH candidates right now.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {signalCandidates.map((row) => (
                  <div key={row.symbol} className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-200">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-50">{row.symbol}</span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${signalBadgeClasses(row.signal)}`}>
                        {row.signal}
                      </span>
                    </div>
                    <ul className="space-y-1 leading-6 text-slate-300">
                      <li><strong className="text-slate-100">Side:</strong> {row.side}</li>
                      <li><strong className="text-slate-100">Quality:</strong> {row.quality}</li>
                      <li><strong className="text-slate-100">Risk:</strong> {row.risk || "-"}</li>
                      <li><strong className="text-slate-100">Context:</strong> {contextText(row.patternContext)}</li>
                      <li><strong className="text-slate-100">Invalidation:</strong> {row.invalidation ?? "-"}</li>
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-slate-400">{row.notes.join(" | ")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={shellClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-50">Archive Timeline</h2>
              <span className="text-sm text-slate-300">recent snapshots</span>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              {recentHistory.length === 0 ? (
                <p>No history yet.</p>
              ) : (
                recentHistory.map((entry) => {
                  const activeRows = (entry.rows || []).filter((row) => row.signal === "YES" || row.signal === "WATCH");
                  const activeText = activeRows.length > 0
                    ? activeRows.map((row) => `${row.symbol} ${row.signal}`).join(" | ")
                    : "No active signal candidates";
                  return (
                    <div key={entry.updatedAt} className="rounded-xl border border-white/10 bg-slate-950/25 p-3">
                      <p className="font-medium text-slate-100">{new Date(entry.updatedAt).toLocaleString()}</p>
                      <p className="mt-1">YES: {entry.summary.yes} | WATCH: {entry.summary.watch} | NO: {entry.summary.no}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{activeText}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className={`${shellClass} mt-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-50">Full DiverT Board</h2>
            <span className="text-sm text-slate-300">all tracked symbols</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-3 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium">Signal</th>
                  <th className="px-3 py-3 font-medium">Side</th>
                  <th className="px-3 py-3 font-medium">Quality</th>
                  <th className="px-3 py-3 font-medium">Context</th>
                  <th className="px-3 py-3 font-medium">Invalidation</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...signalCandidates, ...noSignalRows].map((row) => (
                  <tr key={row.symbol} className="border-b border-white/5 text-slate-300">
                    <td className="px-3 py-3 font-medium text-slate-100">{row.symbol}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${signalBadgeClasses(row.signal)}`}>
                        {row.signal}
                      </span>
                    </td>
                    <td className="px-3 py-3">{row.side}</td>
                    <td className="px-3 py-3">{row.quality}</td>
                    <td className="px-3 py-3">{contextText(row.patternContext)}</td>
                    <td className="px-3 py-3">{row.invalidation ?? "-"}</td>
                    <td className="px-3 py-3 text-slate-400">{row.notes.join(" | ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className={shellClass}>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Refresh Path</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Page auto-refreshes every 30s</li>
              <li>Feed refreshes when snapshot generator runs</li>
              <li>Generator: <code className="rounded bg-black/20 px-1.5 py-0.5 text-slate-200">python scripts\generate_divert_snapshot.py</code></li>
              <li>Scheduler helper: <code className="rounded bg-black/20 px-1.5 py-0.5 text-slate-200">powershell -File scripts\generate_divert_snapshot.ps1</code></li>
              <li>Archive stored in <code className="rounded bg-black/20 px-1.5 py-0.5 text-slate-200">public/data/divert-history.json</code></li>
            </ul>
          </div>

          <div className={shellClass}>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Current Read</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>DiverT only</li>
              <li>RAI Strategy deferred</li>
              <li>Best visible focus = active candidates first</li>
              <li>Archive now shows snapshot-level signal context</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
