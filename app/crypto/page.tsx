"use client";

import { useEffect, useMemo, useState } from "react";

type OpenPaperPosition = {
  symbol: string;
  side: string;
  entryPrice: number | null;
  entryAt: string;
  entryState: string;
  trendDirection: string;
  tradePermission: string;
  invalidationLevel: number | null;
  formationType: string;
  detectedAt: string;
  lastSeenAt: string;
  currentPrice: number | null;
  status: string;
  maxPlPercent?: number | null;
  minPlPercent?: number | null;
  closedAt?: string | null;
  closePrice?: number | null;
  closePlPercent?: number | null;
  remainingSizePercent?: number | null;
  partialClosedAt?: string | null;
  partialClosePrice?: number | null;
  partialClosePlPercent?: number | null;
  runnerStopPrice?: number | null;
};

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
  confirmedAt?: string | null;
};

type TrendRow = {
  symbol: string;
  timeframe: string;
  dailyBias: string;
  emaDirection4h: string;
  marketStructure: string;
  adxTrendStrength: string;
  adxValue: number | null;
  bullishScore: number;
  bearishScore: number;
  finalMarketDirection: string;
  invalidationLevel: number | null;
  tradePermission: string;
  price: number | null;
  lastUpdate: string;
  sourceVenue: string;
  dailyClose?: number;
  dailyEma50?: number;
  dailyEma200?: number;
  altContextLabel?: string;
  altContextScore?: number;
  error?: string;
};

type BtcContextRow = {
  symbol: string;
  price?: number | null;
  value?: number | null;
  trend?: string;
  bias?: string;
  ema?: string;
  structure?: string;
  adx?: number | null;
  permission?: string;
  lastUpdate?: string;
  sourceVenue?: string;
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

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatSizePercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(0)}%`;
}

function formatPL(entryPrice?: number | null, currentPrice?: number | null, side?: string) {
  if (entryPrice == null || currentPrice == null || !Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || entryPrice === 0) return "-";
  const raw = side === "SHORT"
    ? ((entryPrice - currentPrice) / entryPrice) * 100
    : ((currentPrice - entryPrice) / entryPrice) * 100;
  return formatPercent(raw);
}

function percentTextClass(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-slate-300";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function trendBadgeClasses(trend: string) {
  if (trend.includes("BULLISH")) return "border-emerald-200/70 bg-emerald-300/20 text-emerald-50";
  if (trend.includes("BEARISH")) return "border-rose-200/70 bg-rose-300/20 text-rose-50";
  if (trend === "SIDEWAYS") return "border-amber-200/70 bg-amber-300/20 text-amber-50";
  return "border-slate-200/25 bg-slate-100/10 text-slate-100";
}

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

export default function CryptoDashboardPage() {
  const [openPaperPositions, setOpenPaperPositions] = useState<OpenPaperPosition[]>([]);
  const [interestRows, setInterestRows] = useState<InterestRow[]>([]);
  const [formationRows, setFormationRows] = useState<FormationRow[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [btcContextRows, setBtcContextRows] = useState<BtcContextRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [nextScanAt, setNextScanAt] = useState<string>("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/rsi-trend?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
        const data = await res.json();
        setOpenPaperPositions(data.openPaperPositions || []);
        setInterestRows(data.interestRows || []);
        setFormationRows(data.formationRows || []);
        setTrendRows(data.trendRows || []);
        setBtcContextRows(data.btcContextRows || []);
        setUpdatedAt(data.updatedAt || "");
        setNextScanAt(data.nextScanAt || "");
        scheduleNextLoad(data.nextScanAt);
      } catch (error) {
        console.error("crypto dashboard load failed", error);
        setInterestRows([]);
        setFormationRows([]);
        setTrendRows([]);
        setBtcContextRows([]);
      }
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
      uptrend: trendRows.filter((row) => row.finalMarketDirection.includes("BULLISH")).length,
      downtrend: trendRows.filter((row) => row.finalMarketDirection.includes("BEARISH")).length,
      range: trendRows.filter((row) => row.finalMarketDirection === "SIDEWAYS" || row.finalMarketDirection === "UNCLEAR").length,
    };
  }, [trendRows]);

  const orderedPaperPositions = useMemo(() => {
    return [...openPaperPositions].sort((a, b) => {
      const aTime = new Date(a.entryAt).getTime();
      const bTime = new Date(b.entryAt).getTime();
      return bTime - aTime;
    });
  }, [openPaperPositions]);

  const activePaperPositions = useMemo(() => {
    return orderedPaperPositions.filter((row) => !(row.closedAt || row.status.startsWith("closed")));
  }, [orderedPaperPositions]);

  const closedPaperPositions = useMemo(() => {
    return orderedPaperPositions.filter((row) => row.closedAt || row.status.startsWith("closed"));
  }, [orderedPaperPositions]);

  const paperPositionLabels = useMemo(() => {
    const bySymbol = new Map<string, OpenPaperPosition[]>();
    for (const row of openPaperPositions) {
      const bucket = bySymbol.get(row.symbol) || [];
      bucket.push(row);
      bySymbol.set(row.symbol, bucket);
    }

    const labelMap = new Map<string, string>();
    for (const [symbol, rows] of bySymbol.entries()) {
      const ordered = [...rows].sort((a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime());
      if (ordered.length === 1) {
        const row = ordered[0];
        labelMap.set(`${row.symbol}-${row.side}-${row.entryAt}`, row.symbol);
        continue;
      }
      ordered.forEach((row, index) => {
        labelMap.set(`${row.symbol}-${row.side}-${row.entryAt}`, `${symbol} (${index + 1})`);
      });
    }
    return labelMap;
  }, [openPaperPositions]);

  const orderedTrendRows = useMemo(() => {
    const order: Record<string, number> = {
      "STRONG BULLISH": 0,
      "MODERATE BULLISH": 1,
      "STRONG BEARISH": 2,
      "MODERATE BEARISH": 3,
      "SIDEWAYS": 4,
      "UNCLEAR": 5,
    };

    return [...trendRows].sort((a, b) => {
      const trendDiff = (order[a.finalMarketDirection] ?? 99) - (order[b.finalMarketDirection] ?? 99);
      if (trendDiff !== 0) return trendDiff;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [trendRows]);

  const btcContextDisplayRows = useMemo(() => {
    return btcContextRows;
  }, [btcContextRows]);

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

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Open Paper Positions</h2>
            <span className="text-[10px] text-slate-400">{activePaperPositions.length} active</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Entry price</th>
                  <th className="px-4 py-3 text-left">Current price</th>
                  <th className="px-4 py-3 text-left">P/L</th>
                  <th className="px-4 py-3 text-left">Best P/L</th>
                  <th className="px-4 py-3 text-left">Worst P/L</th>
                  <th className="px-4 py-3 text-left">Entry at</th>
                  <th className="px-4 py-3 text-left">Entry state</th>
                  <th className="px-4 py-3 text-left">Invalidation</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Remaining</th>
                  <th className="px-4 py-3 text-left">Partial close</th>
                  <th className="px-4 py-3 text-left">Partial P/L</th>
                  <th className="px-4 py-3 text-left">Runner SL</th>
                </tr>
              </thead>
              <tbody>
                {activePaperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-4 text-slate-400">No open paper positions right now.</td>
                  </tr>
                ) : (
                  activePaperPositions.map((row) => (
                    <tr key={`${row.symbol}-${row.side}-${row.entryAt}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(`${row.symbol}-${row.side}-${row.entryAt}`) || row.symbol}</td>
                      <td className="px-4 py-3">{row.side}</td>
                      <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                      <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(
                        row.entryPrice != null && row.currentPrice != null && Number.isFinite(row.entryPrice) && Number.isFinite(row.currentPrice) && row.entryPrice !== 0
                          ? (row.side === "SHORT"
                            ? ((row.entryPrice - row.currentPrice) / row.entryPrice) * 100
                            : ((row.currentPrice - row.entryPrice) / row.entryPrice) * 100)
                          : null
                      )}`}>{formatPL(row.entryPrice, row.currentPrice, row.side)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.maxPlPercent)}`}>{formatPercent(row.maxPlPercent)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.minPlPercent)}`}>{formatPercent(row.minPlPercent)}</td>
                      <td className="px-4 py-3">{new Date(row.entryAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{row.entryState}</td>
                      <td className="px-4 py-3">{formatPrice(row.invalidationLevel)}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">{formatSizePercent(row.remainingSizePercent)}</td>
                      <td className="px-4 py-3">{formatPrice(row.partialClosePrice)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.partialClosePlPercent)}`}>{formatPercent(row.partialClosePlPercent)}</td>
                      <td className="px-4 py-3">{formatPrice(row.runnerStopPrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Closed Paper Positions</h2>
            <span className="text-[10px] text-slate-400">{closedPaperPositions.length} closed</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Entry price</th>
                  <th className="px-4 py-3 text-left">Current price</th>
                  <th className="px-4 py-3 text-left">Best P/L</th>
                  <th className="px-4 py-3 text-left">Worst P/L</th>
                  <th className="px-4 py-3 text-left">Entry at</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Remaining</th>
                  <th className="px-4 py-3 text-left">Partial close</th>
                  <th className="px-4 py-3 text-left">Partial P/L</th>
                  <th className="px-4 py-3 text-left">Runner SL</th>
                  <th className="px-4 py-3 text-left">Close price</th>
                  <th className="px-4 py-3 text-left">Close P/L</th>
                  <th className="px-4 py-3 text-left">Closed at</th>
                </tr>
              </thead>
              <tbody>
                {closedPaperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-4 text-slate-400">No closed paper positions yet.</td>
                  </tr>
                ) : (
                  closedPaperPositions.map((row) => (
                    <tr key={`${row.symbol}-${row.side}-${row.entryAt}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(`${row.symbol}-${row.side}-${row.entryAt}`) || row.symbol}</td>
                      <td className="px-4 py-3">{row.side}</td>
                      <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                      <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.maxPlPercent)}`}>{formatPercent(row.maxPlPercent)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.minPlPercent)}`}>{formatPercent(row.minPlPercent)}</td>
                      <td className="px-4 py-3">{new Date(row.entryAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">{formatSizePercent(row.remainingSizePercent)}</td>
                      <td className="px-4 py-3">{formatPrice(row.partialClosePrice)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.partialClosePlPercent)}`}>{formatPercent(row.partialClosePlPercent)}</td>
                      <td className="px-4 py-3">{formatPrice(row.runnerStopPrice)}</td>
                      <td className="px-4 py-3">{formatPrice(row.closePrice)}</td>
                      <td className={`px-4 py-3 ${percentTextClass(row.closePlPercent)}`}>{formatPercent(row.closePlPercent)}</td>
                      <td className="px-4 py-3">{row.closedAt ? new Date(row.closedAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">BTC Context</h2>
            <span className="text-[10px] text-slate-400">macro filter</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Trend</th>
                  <th className="px-4 py-3 text-left">Daily bias</th>
                  <th className="px-4 py-3 text-left">4H EMA</th>
                  <th className="px-4 py-3 text-left">Structure</th>
                  <th className="px-4 py-3 text-left">ADX</th>
                  <th className="px-4 py-3 text-left">Permission</th>
                </tr>
              </thead>
              <tbody>
                {btcContextDisplayRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-slate-400">No BTC context yet.</td>
                  </tr>
                ) : (
                  btcContextDisplayRows.map((row) => (
                    <tr key={row.symbol} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                      <td className="px-4 py-3">{row.symbol === "BTC.D" ? formatPercent(row.value) : formatPrice(row.price)}</td>
                      <td className="px-4 py-3">{row.trend ? <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${trendBadgeClasses(row.trend)}`}>{row.trend}</span> : "-"}</td>
                      <td className="px-4 py-3">{row.bias || "-"}</td>
                      <td className="px-4 py-3">{row.ema || "-"}</td>
                      <td className="px-4 py-3">{row.structure || "-"}</td>
                      <td className="px-4 py-3">{row.adx != null ? row.adx : "-"}</td>
                      <td className="px-4 py-3">{row.permission || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

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
                  <th className="px-4 py-3 text-left">Confirmed at</th>
                  <th className="px-4 py-3 text-left">Detected at</th>
                </tr>
              </thead>
              <tbody>
                {formationRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-4 text-slate-400">No HL/LH formations detected right now.</td>
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
                      <td className="px-4 py-3">{row.confirmedAt ? new Date(row.confirmedAt).toLocaleString() : "-"}</td>
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
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Daily bias</th>
                  <th className="px-4 py-3 text-left">4H EMA</th>
                  <th className="px-4 py-3 text-left">Structure</th>
                  <th className="px-4 py-3 text-left">ADX</th>
                  <th className="px-4 py-3 text-left">Bull score</th>
                  <th className="px-4 py-3 text-left">Bear score</th>
                  <th className="px-4 py-3 text-left">Invalidation</th>
                  <th className="px-4 py-3 text-left">Context</th>
                  <th className="px-4 py-3 text-left">Permission</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Last update</th>
                </tr>
              </thead>
              <tbody>
                {orderedTrendRows.map((row) => (
                  <tr key={`${row.symbol}-${row.lastUpdate}`} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${trendBadgeClasses(row.finalMarketDirection)}`}>
                        {row.finalMarketDirection}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.dailyBias}</td>
                    <td className="px-4 py-3">{row.emaDirection4h}</td>
                    <td className="px-4 py-3">{row.marketStructure}</td>
                    <td className="px-4 py-3">{row.adxValue != null ? `${row.adxValue.toFixed(2)} (${row.adxTrendStrength})` : row.adxTrendStrength}</td>
                    <td className="px-4 py-3">{row.bullishScore}</td>
                    <td className="px-4 py-3">{row.bearishScore}</td>
                    <td className="px-4 py-3">{formatPrice(row.invalidationLevel)}</td>
                    <td className="px-4 py-3">{row.altContextLabel ? `${row.altContextLabel}${typeof row.altContextScore === "number" ? ` (${row.altContextScore > 0 ? "+" : ""}${row.altContextScore})` : ""}` : "-"}</td>
                    <td className="px-4 py-3">{row.tradePermission}</td>
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
