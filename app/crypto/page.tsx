"use client";

import { useEffect, useMemo, useState } from "react";

type InterestRow = {
  symbol: string;
  rsi: number;
  price: number | null;
  zone: string;
  detectedAt: string;
  anchorRsi: number | null;
  anchorTime: string | null;
  timeframe: string;
  sourceVenue: string;
};

type FormationRow = {
  symbol: string;
  side: string;
  formationType: string;
  trendStatus: string;
  state: string;
  majorLevel: number;
  currentLevel: number;
  reaction: string;
  emaZone: string;
  rsiDivergence: string;
  price: number | null;
  detectedAt: string;
};

type TrendRow = {
  symbol: string;
  trend: string;
  strength: string;
  score: number;
  trendSignal: string;
  lastHigherHigh: number | null;
  lastHigherLow: number | null;
  lastLowerHigh: number | null;
  lastLowerLow: number | null;
  emaAligned: boolean;
  breakoutConfirmed: boolean;
  price: number | null;
  lastUpdate: string;
  timeframe: string;
  sourceVenue: string;
  error?: string;
};

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  if (abs >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

function zoneLabel(zone: string) {
  if (zone === "lower_interest") return "lower interest";
  if (zone === "upper_interest") return "upper interest";
  return zone;
}

function trendBadgeClasses(trend: string) {
  if (trend === "uptrend") return "border-emerald-200/70 bg-emerald-300/20 text-emerald-50";
  if (trend === "downtrend") return "border-rose-200/70 bg-rose-300/20 text-rose-50";
  if (trend === "range") return "border-amber-200/70 bg-amber-300/20 text-amber-50";
  return "border-slate-200/25 bg-slate-100/10 text-slate-100";
}

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

export default function CryptoDashboardPage() {
  const [interestRows, setInterestRows] = useState<InterestRow[]>([]);
  const [formationRows, setFormationRows] = useState<FormationRow[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [nextScanAt, setNextScanAt] = useState<string>("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const res = await fetch(`/api/rsi-trend?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setInterestRows(data.interestRows || []);
      setFormationRows(data.formationRows || []);
      setTrendRows(data.trendRows || []);
      setUpdatedAt(data.updatedAt || "");
      setNextScanAt(data.nextScanAt || "");
      scheduleNextLoad(data.nextScanAt);
    };

    const scheduleNextLoad = (nextIso?: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      const fallbackMs = 60 * 1000;
      if (!nextIso) {
        timeoutId = setTimeout(load, fallbackMs);
        return;
      }
      const targetMs = new Date(nextIso).getTime() - Date.now() + 15000;
      timeoutId = setTimeout(load, Math.max(15000, targetMs));
    };

    load();
    intervalId = setInterval(load, 60 * 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const trendSummary = useMemo(() => {
    return {
      uptrend: trendRows.filter((row) => row.trend === "uptrend").length,
      downtrend: trendRows.filter((row) => row.trend === "downtrend").length,
      range: trendRows.filter((row) => row.trend === "range").length,
    };
  }, [trendRows]);

  const orderedTrendRows = useMemo(() => {
    const order: Record<string, number> = {
      uptrend: 0,
      downtrend: 1,
      range: 2,
      unknown: 3,
      error: 4,
    };

    return [...trendRows].sort((a, b) => {
      const trendDiff = (order[a.trend] ?? 99) - (order[b.trend] ?? 99);
      if (trendDiff !== 0) return trendDiff;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [trendRows]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-3 py-4 md:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">RAI Crypto Dashboard</h1>
            <p className="text-sm text-slate-300">4H radar: RSI interest zones + HL/LH formation + trend overview</p>
          </div>
          <div className="text-xs leading-5 text-slate-200">
            <p>Status: dashboard simplified</p>
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
            <p>Next scan: {nextScanAt ? new Date(nextScanAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <section className="mb-4 grid gap-2 md:grid-cols-4">
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Interest rows</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{interestRows.length}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Uptrend</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{trendSummary.uptrend}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Downtrend</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{trendSummary.downtrend}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Range</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{trendSummary.range}</p>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">RSI Interest Zones</h2>
            <span className="text-[10px] text-slate-400">4H only</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">RSI</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Zone</th>
                  <th className="px-4 py-3 text-left">Prior RSI anchor</th>
                  <th className="px-4 py-3 text-left">Anchor time</th>
                  <th className="px-4 py-3 text-left">Detected at</th>
                </tr>
              </thead>
              <tbody>
                {interestRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-slate-400">No coins in RSI interest zones right now.</td>
                  </tr>
                ) : (
                  interestRows.map((row) => (
                    <tr key={`${row.symbol}-${row.detectedAt}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                      <td className="px-4 py-3">{row.rsi.toFixed(2)}</td>
                      <td className="px-4 py-3">{formatPrice(row.price)}</td>
                      <td className="px-4 py-3">{zoneLabel(row.zone)}</td>
                      <td className="px-4 py-3">{row.anchorRsi != null ? row.anchorRsi.toFixed(2) : "-"}</td>
                      <td className="px-4 py-3">{row.anchorTime ? new Date(row.anchorTime).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">{new Date(row.detectedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">HL / LH Formation Scanner</h2>
            <span className="text-[10px] text-slate-400">4H only</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-left">Formation</th>
                  <th className="px-4 py-3 text-left">Trend</th>
                  <th className="px-4 py-3 text-left">State</th>
                  <th className="px-4 py-3 text-left">Major level</th>
                  <th className="px-4 py-3 text-left">Current level</th>
                  <th className="px-4 py-3 text-left">Reaction</th>
                  <th className="px-4 py-3 text-left">EMA zone</th>
                  <th className="px-4 py-3 text-left">RSI divergence</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Detected at</th>
                </tr>
              </thead>
              <tbody>
                {formationRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-4 text-slate-400">No HL/LH formations detected right now.</td>
                  </tr>
                ) : (
                  formationRows.map((row) => (
                    <tr key={`${row.symbol}-${row.side}-${row.detectedAt}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                      <td className="px-4 py-3">{row.side}</td>
                      <td className="px-4 py-3">{row.formationType}</td>
                      <td className="px-4 py-3">{row.trendStatus}</td>
                      <td className="px-4 py-3">{row.state}</td>
                      <td className="px-4 py-3">{formatPrice(row.majorLevel)}</td>
                      <td className="px-4 py-3">{formatPrice(row.currentLevel)}</td>
                      <td className="px-4 py-3">{row.reaction}</td>
                      <td className="px-4 py-3">{row.emaZone}</td>
                      <td className="px-4 py-3">{row.rsiDivergence}</td>
                      <td className="px-4 py-3">{formatPrice(row.price)}</td>
                      <td className="px-4 py-3">{new Date(row.detectedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={shellClass}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Trend Overview</h2>
            <span className="text-[10px] text-slate-400">4H only</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Trend</th>
                  <th className="px-4 py-3 text-left">Strength</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Signal</th>
                  <th className="px-4 py-3 text-left">Last HH</th>
                  <th className="px-4 py-3 text-left">Last HL</th>
                  <th className="px-4 py-3 text-left">Last LH</th>
                  <th className="px-4 py-3 text-left">Last LL</th>
                  <th className="px-4 py-3 text-left">EMA</th>
                  <th className="px-4 py-3 text-left">Breakout</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Last update</th>
                </tr>
              </thead>
              <tbody>
                {orderedTrendRows.map((row) => (
                  <tr key={`${row.symbol}-${row.lastUpdate}`} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${trendBadgeClasses(row.trend)}`}>
                        {row.trend}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.strength}</td>
                    <td className="px-4 py-3">{row.score}</td>
                    <td className="px-4 py-3">{row.trendSignal}</td>
                    <td className="px-4 py-3">{formatPrice(row.lastHigherHigh)}</td>
                    <td className="px-4 py-3">{formatPrice(row.lastHigherLow)}</td>
                    <td className="px-4 py-3">{formatPrice(row.lastLowerHigh)}</td>
                    <td className="px-4 py-3">{formatPrice(row.lastLowerLow)}</td>
                    <td className="px-4 py-3">{row.emaAligned ? "aligned" : "no"}</td>
                    <td className="px-4 py-3">{row.breakoutConfirmed ? "yes" : "no"}</td>
                    <td className="px-4 py-3">{formatPrice(row.price)}</td>
                    <td className="px-4 py-3">{new Date(row.lastUpdate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
