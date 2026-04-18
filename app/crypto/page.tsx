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
  execution?: {
    status: string;
    entry: string;
    invalidation: number | null;
    exitTrigger: string;
  };
};

type HistoryEntry = {
  updatedAt: string;
  summary: {
    yes: number;
    watch: number;
    nearSetup?: number;
    no: number;
  };
  rows?: SignalRow[];
};

type PostExitRow = {
  symbol: string;
  timeframe: string;
  entryPrice: number;
  exitPrice: number;
  invalidationPrice: number;
  quality: string;
  risk: string;
  patternContext: string;
  exitReason: string;
  postExitReturns: Record<string, number>;
  postExitMaxReturn: number | null;
  notes: string[];
};

type TradeLogRow = {
  symbol: string;
  side: string;
  timeframe: string;
  status: string;
  entryPrice: number | null;
  invalidationPrice: number | null;
  exitPrice: number | null;
  resultPct: number | null;
  quality: string;
  openedAt: string | null;
  closedAt: string | null;
  notes: string[];
};

type PositionTrackerRow = {
  symbol: string;
  side?: string;
  timeframe?: string;
  entryPrice: number | null;
  currentPrice: number | null;
  exitPrice?: number | null;
  pnlPct: number | null;
  status: string;
  openedAt?: string | null;
  closedAt?: string | null;
};

type AlertRow = {
  symbol: string;
  type: string;
  priority: string;
  message: string;
  createdAt: string;
};

function signalBadgeClasses(signal: string) {
  if (signal === "YES") return "border-emerald-200/70 bg-emerald-300/20 text-emerald-50";
  if (signal === "WATCH") return "border-amber-200/70 bg-amber-300/20 text-amber-50";
  if (signal === "NEAR_SETUP") return "border-sky-200/70 bg-sky-300/20 text-sky-50";
  return "border-slate-200/25 bg-slate-100/10 text-slate-100";
}

function contextText(patternContext?: string) {
  if (patternContext === "positive") return "positive";
  if (patternContext === "negative") return "negative";
  return "neutral";
}

const shellClass = "rounded-2xl border border-slate-100/12 bg-slate-800/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm";

function statusBadgeClasses(status: string) {
  if (status === "closed_green") return "border-emerald-200/70 bg-emerald-300/20 text-emerald-50";
  if (status === "closed_red") return "border-rose-200/70 bg-rose-300/20 text-rose-50";
  if (status === "open_green") return "border-lime-200/70 bg-lime-300/20 text-lime-50";
  if (status === "open_red") return "border-amber-200/70 bg-amber-300/20 text-amber-50";
  return "border-slate-200/25 bg-slate-100/10 text-slate-100";
}

function pnlTextClass(pnlPct: number | null) {
  if (pnlPct == null) return "text-slate-100";
  if (pnlPct > 0) return "text-emerald-300";
  if (pnlPct < 0) return "text-rose-300";
  return "text-slate-100";
}

export default function CryptoDashboardPage() {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [postExit, setPostExit] = useState<PostExitRow[]>([]);
  const [tradeLog, setTradeLog] = useState<TradeLogRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/divert", { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
      setHistory(data.history || []);
      setPostExit(data.postExit || []);
      setTradeLog(data.tradeLog || []);
      setAlerts(data.alerts || []);
      setUpdatedAt(data.updatedAt || "");
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const yesSignals = rows.filter((row) => row.signal === "YES").length;
    const watchSignals = rows.filter((row) => row.signal === "WATCH").length;
    const nearSetupSignals = rows.filter((row) => row.signal === "NEAR_SETUP").length;
    const longBias = rows.filter((row) => row.side === "LONG" || row.side === "BUY").length;
    const shortBias = rows.filter((row) => row.side === "SHORT" || row.side === "SELL").length;
    return { yesSignals, watchSignals, nearSetupSignals, longBias, shortBias };
  }, [rows]);

  const topYes = rows.filter((row) => row.signal === "YES");
  const topWatch = rows.filter((row) => row.signal === "WATCH");
  const topNear = rows.filter((row) => row.signal === "NEAR_SETUP");
  const topSignalText = topYes.length > 0
    ? `YES active: ${topYes.map((row) => row.symbol).join(", ")}`
    : topWatch.length > 0
      ? `WATCH active: ${topWatch.map((row) => row.symbol).join(", ")}`
      : topNear.length > 0
        ? `NEAR SETUP: ${topNear.map((row) => row.symbol).join(", ")}`
        : "No active DiverT signal right now";

  const scoredCandidates = rows
    .filter((row) => row.signal === "YES" || row.signal === "WATCH" || row.signal === "NEAR_SETUP")
    .map((row) => {
      const score =
        (row.signal === "YES" ? 100 : row.signal === "WATCH" ? 70 : 50) +
        (row.quality === "GOOD" ? 15 : row.quality === "MEDIUM" ? 8 : 0) +
        (row.patternContext === "positive" ? 8 : row.patternContext === "negative" ? -8 : 0) +
        (row.risk === "medium" ? 5 : row.risk === "medium_high" ? -3 : 0);
      return { ...row, priorityScore: score };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const signalCandidates = scoredCandidates;
  const noSignalRows = rows.filter((row) => row.signal === "NO");
  const recentHistory = history.slice(-8).reverse();
  const strongestPositive = rows.filter((row) => row.patternContext === "positive").map((row) => row.symbol).slice(0, 4);

  const livePriceMap = useMemo(() => {
    const map = new Map<string, number | null>();
    rows.forEach((row) => {
      const raw = row.notes.find((note) => note.startsWith("price_now="));
      if (!raw) {
        map.set(row.symbol, null);
        return;
      }
      const value = Number(raw.replace("price_now=", ""));
      map.set(row.symbol, Number.isFinite(value) ? value : null);
    });
    return map;
  }, [rows]);

  const trackedPositions = useMemo(() => {
    return tradeLog
      .filter((row) => row.entryPrice !== null || row.status === "closed")
      .map((row) => {
        const livePrice = livePriceMap.get(row.symbol) ?? null;
        const currentPrice = row.status === "closed"
          ? row.exitPrice ?? row.entryPrice
          : livePrice ?? row.entryPrice;

        const signedPnl = row.resultPct ?? (
          row.entryPrice != null && currentPrice != null
            ? Number((((currentPrice - row.entryPrice) / row.entryPrice) * 100).toFixed(2))
            : null
        );

        const pnlPct = row.side === "SELL" && signedPnl != null ? Number((-signedPnl).toFixed(2)) : signedPnl;

        const normalizedStatus = row.status === "closed"
          ? ((pnlPct ?? 0) >= 0 ? "closed_green" : "closed_red")
          : ((pnlPct ?? 0) >= 0 ? "open_green" : "open_red");

        return {
          symbol: row.symbol,
          side: row.side,
          timeframe: row.timeframe,
          entryPrice: row.entryPrice,
          currentPrice,
          exitPrice: row.exitPrice,
          pnlPct,
          status: normalizedStatus,
          openedAt: row.openedAt,
          closedAt: row.closedAt,
        };
      });
  }, [tradeLog, livePriceMap]);

  const openPositions = trackedPositions.filter((row) => row.status.startsWith("open_"));
  const closedPositions = trackedPositions.filter((row) => row.status.startsWith("closed_"));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">
              RAI Crypto Dashboard
            </h1>
            <p className="text-base text-slate-200">DiverT Strategy live board</p>
          </div>
          <div className="text-sm leading-6 text-slate-200">
            <p>Status: dashboard v0.8</p>
            <p>Page refresh: 30s</p>
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className={`${shellClass} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last refresh</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
          </div>
          <div className={`${shellClass} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active candidates</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{signalCandidates.length}</p>
            <p className="mt-1 text-sm text-slate-400">YES + WATCH + NEAR SETUP currently visible</p>
          </div>
          <div className={`${shellClass} p-4`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strongest context</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{strongestPositive.length ? strongestPositive.join(", ") : "None"}</p>
            <p className="mt-1 text-sm text-slate-400">Positive pattern context snapshot</p>
          </div>
        </section>

        <section className={`${shellClass} mb-8`}>
          <h2 className="mb-2 text-xl font-semibold text-white">Top Signal</h2>
          <p className="text-sm leading-7 text-slate-100">{topSignalText}</p>
        </section>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-white">DiverT Strategy</h2>
            <ul className="space-y-2 text-sm leading-7 text-slate-100">
              <li>Price LL</li>
              <li>RSI HL</li>
              <li>RSI low 2 &gt; 30</li>
              <li>Bounce capture logic</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-white">Signal Stats</h2>
            <ul className="space-y-2 text-sm leading-7 text-slate-100">
              <li>YES: {stats.yesSignals}</li>
              <li>WATCH: {stats.watchSignals}</li>
              <li>NEAR SETUP: {stats.nearSetupSignals}</li>
              <li>Long bias: {stats.longBias}</li>
              <li>Short bias: {stats.shortBias}</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-white">Feed Engine</h2>
            <ul className="space-y-2 text-sm leading-7 text-slate-100">
              <li>Source: precomputed JSON</li>
              <li>Scanner: local generator</li>
              <li>Archive: enabled</li>
              <li>Runtime-safe for Vercel</li>
            </ul>
          </section>

          <section className={shellClass}>
            <h2 className="mb-3 text-lg font-semibold text-white">Next</h2>
            <ul className="space-y-2 text-sm leading-7 text-slate-100">
              <li>Activate local scheduler</li>
              <li>Add post-exit tracking</li>
              <li>Add richer archive view</li>
              <li>Expand watch universe further if needed</li>
            </ul>
          </section>
        </div>

        <section className={`${shellClass} mt-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-50">Alerts</h2>
            <span className="text-sm text-slate-300">setup / entry / close</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-300">No alerts right now.</p>
            ) : (
              alerts.map((alert) => (
                <div key={`${alert.symbol}-${alert.type}-${alert.createdAt}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-100">{alert.symbol}</p>
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-100">{alert.type}</span>
                  </div>
                  <p className="mt-2 text-slate-200">{alert.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{alert.priority} | {new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={`${shellClass} mt-8`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-50">Simple Position Tracker</h2>
            <span className="text-sm text-slate-300">open + closed</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Open Positions</h3>
                <span className="text-xs text-slate-400">live P/L</span>
              </div>
              <div className="space-y-3">
                {openPositions.length === 0 ? (
                  <p className="text-sm text-slate-300">No open positions right now.</p>
                ) : (
                  openPositions.map((row) => (
                    <div key={`${row.symbol}-${row.status}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{row.symbol}</p>
                          <p className="text-xs text-slate-400">{row.side ?? "-"} | {row.timeframe ?? "-"}</p>
                        </div>
                        <span className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClasses(row.status)}`}>
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Entry</p>
                          <p className="mt-1 font-medium text-slate-100">{row.entryPrice ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Now</p>
                          <p className="mt-1 font-medium text-slate-100">{row.currentPrice ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Opened</p>
                          <p className="mt-1 font-medium text-slate-100">{row.openedAt ? new Date(row.openedAt).toLocaleString() : "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">P/L</p>
                          <p className={`mt-1 font-semibold ${pnlTextClass(row.pnlPct)}`}>{row.pnlPct ?? "-"}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Closed Positions</h3>
                <span className="text-xs text-slate-400">final result</span>
              </div>
              <div className="space-y-3">
                {closedPositions.length === 0 ? (
                  <p className="text-sm text-slate-300">No closed positions yet.</p>
                ) : (
                  closedPositions.map((row) => (
                    <div key={`${row.symbol}-${row.status}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-100">{row.symbol}</p>
                          <p className="text-xs text-slate-400">{row.side ?? "-"} | {row.timeframe ?? "-"}</p>
                        </div>
                        <span className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClasses(row.status)}`}>
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Entry</p>
                          <p className="mt-1 font-medium text-slate-100">{row.entryPrice ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Close</p>
                          <p className="mt-1 font-medium text-slate-100">{row.exitPrice ?? row.currentPrice ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Opened</p>
                          <p className="mt-1 font-medium text-slate-100">{row.openedAt ? new Date(row.openedAt).toLocaleString() : "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Closed</p>
                          <p className="mt-1 font-medium text-slate-100">{row.closedAt ? new Date(row.closedAt).toLocaleString() : "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">P/L</p>
                          <p className={`mt-1 font-semibold ${pnlTextClass(row.pnlPct)}`}>{row.pnlPct ?? "-"}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/5 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-50">Signal Candidates</h2>
              <span className="text-sm text-emerald-100/90">YES / WATCH / NEAR SETUP</span>
            </div>
            {signalCandidates.length === 0 ? (
              <p className="text-sm leading-6 text-slate-300">No active YES or WATCH candidates right now.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {signalCandidates.map((row) => (
                  <div key={row.symbol} className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-200">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-50">{row.symbol}</span>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${signalBadgeClasses(row.signal)}`}>
                        {row.signal}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Side</p>
                        <p className="mt-1 font-medium text-slate-100">{row.side}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Quality</p>
                        <p className="mt-1 font-medium text-slate-100">{row.quality}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Risk</p>
                        <p className="mt-1 font-medium text-slate-100">{row.risk || "-"}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Context</p>
                        <p className="mt-1 font-medium text-slate-100">{contextText(row.patternContext)}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 sm:col-span-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Priority Score</p>
                        <p className="mt-1 font-medium text-slate-100">{row.priorityScore}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Invalidation</p>
                      <p className="mt-1 font-medium text-slate-100">{row.invalidation ?? "-"}</p>
                    </div>
                    <div className="mt-3 rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Execution</p>
                      <p className="mt-1 font-medium text-slate-100">{row.execution?.entry ?? "-"}</p>
                      <p className="mt-1 text-xs text-slate-400">Exit: {row.execution?.exitTrigger ?? "-"}</p>
                    </div>
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
                      <p className="mt-1">YES: {entry.summary.yes} | WATCH: {entry.summary.watch} | NEAR: {entry.summary.nearSetup ?? 0} | NO: {entry.summary.no}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{activeText}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <div className={shellClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-50">Trade Log</h2>
              <span className="text-sm text-slate-300">real execution memory</span>
            </div>
            <div className="space-y-3">
              {tradeLog.length === 0 ? (
                <p className="text-sm text-slate-300">No trade log records yet.</p>
              ) : (
                tradeLog.map((row) => (
                  <div key={`${row.symbol}-${row.status}-${row.openedAt ?? row.invalidationPrice}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-100">{row.symbol}</span>
                      <span className="rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-100">{row.status}</span>
                    </div>
                    <p><strong className="text-slate-100">Side:</strong> {row.side} | <strong className="text-slate-100">Quality:</strong> {row.quality}</p>
                    <p><strong className="text-slate-100">Entry:</strong> {row.entryPrice ?? "-"} | <strong className="text-slate-100">Exit:</strong> {row.exitPrice ?? "-"}</p>
                    <p><strong className="text-slate-100">Result:</strong> {row.resultPct ?? "-"}% | <strong className="text-slate-100">Invalidation:</strong> {row.invalidationPrice ?? "-"}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{row.notes.join(" | ")}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={shellClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-50">Post-Exit Tracking</h2>
              <span className="text-sm text-slate-300">learning layer</span>
            </div>
            <div className="space-y-3">
              {postExit.length === 0 ? (
                <p className="text-sm text-slate-300">No post-exit records yet.</p>
              ) : (
                postExit.map((row) => (
                  <div key={`${row.symbol}-${row.exitPrice}`} className="rounded-xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-100">{row.symbol}</span>
                      <span className="rounded-full border border-sky-300/40 bg-sky-400/10 px-2 py-1 text-xs font-semibold text-sky-100">{row.exitReason}</span>
                    </div>
                    <p><strong className="text-slate-100">Exit:</strong> {row.exitPrice} | <strong className="text-slate-100">Max after exit:</strong> {row.postExitMaxReturn ?? "-"}%</p>
                    <p><strong className="text-slate-100">+5:</strong> {row.postExitReturns?.bars_5 ?? "-"}% | <strong className="text-slate-100">+10:</strong> {row.postExitReturns?.bars_10 ?? "-"}% | <strong className="text-slate-100">+20:</strong> {row.postExitReturns?.bars_20 ?? "-"}%</p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{row.notes.join(" | ")}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={shellClass}>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Why this matters</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>Trade log captures actual execution history</li>
              <li>Post-exit tracking shows what happened after taking profit</li>
              <li>Together they turn DiverT into a system that executes and learns</li>
            </ul>
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
                  <th className="px-3 py-3 font-medium">Execution</th>
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
                    <td className="px-3 py-3 text-slate-300">{row.execution?.entry ?? "-"}</td>
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
              <li>Scheduler installer: <code className="rounded bg-black/20 px-1.5 py-0.5 text-slate-200">powershell -File scripts\schedule_divert_snapshot.ps1</code></li>
              <li>Archive stored in <code className="rounded bg-black/20 px-1.5 py-0.5 text-slate-200">public/data/divert-history.json</code></li>
            </ul>
          </div>

          <div className={shellClass}>
            <h2 className="mb-3 text-xl font-semibold text-slate-100">Current Read</h2>
            <ul className="space-y-2 text-sm leading-6 text-slate-300">
              <li>DiverT only</li>
              <li>RAI Strategy deferred</li>
              <li>Best visible focus = active candidates first</li>
              <li>Scheduler activation still needs local permissions on this machine</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
