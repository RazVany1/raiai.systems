"use client";

import { useEffect, useMemo, useState } from "react";

type InterestRow = {
  symbol: string;
  rsi: number;
  price: number | null;
  zone: string;
  detectedAt: string;
  timeframe: string;
  sourceVenue: string;
};

type TrendRow = {
  symbol: string;
  trend: string;
  strength: string;
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
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [nextScanAt, setNextScanAt] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/data/rsi-trend-dashboard.json", { cache: "no-store" });
      const data = await res.json();
      setInterestRows(data.interestRows || []);
      setTrendRows(data.trendRows || []);
      setUpdatedAt(data.updatedAt || "");
      setNextScanAt(data.nextScanAt || "");
    };

    load();
    const interval = setInterval(load, 300000);
    return () => clearInterval(interval);
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
            <p className="text-sm text-slate-300">4H radar: RSI interest zones + trend overview</p>
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
                  <th className="px-4 py-3 text-left">Detected at</th>
                </tr>
              </thead>
              <tbody>
                {interestRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-slate-400">No coins in RSI interest zones right now.</td>
                  </tr>
                ) : (
                  interestRows.map((row) => (
                    <tr key={`${row.symbol}-${row.detectedAt}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                      <td className="px-4 py-3">{row.rsi.toFixed(2)}</td>
                      <td className="px-4 py-3">{formatPrice(row.price)}</td>
                      <td className="px-4 py-3">{zoneLabel(row.zone)}</td>
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
