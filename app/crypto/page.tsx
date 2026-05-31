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
  anchorPrice?: number | null;
  timeframe: string;
  sourceVenue: string;
  previousRsi?: number | null;
  firstDetectedAt?: string;
  lastSeenAt?: string;
  currentlyInZone?: boolean;
  serialNumber?: number;
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

function computePlValue(entryPrice?: number | null, currentPrice?: number | null, side?: string) {
  if (entryPrice == null || currentPrice == null || !Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || entryPrice === 0) return null;
  return side === "SHORT"
    ? ((entryPrice - currentPrice) / entryPrice) * 100
    : ((currentPrice - entryPrice) / entryPrice) * 100;
}

function formatPL(entryPrice?: number | null, currentPrice?: number | null, side?: string) {
  return formatPercent(computePlValue(entryPrice, currentPrice, side));
}

function formatCompactDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shortSide(side?: string | null) {
  if (!side) return "-";
  return side === "SHORT" ? "S" : side === "LONG" ? "L" : side.charAt(0).toUpperCase();
}

function shortEntryState(state?: string | null) {
  if (!state) return "-";
  return state.charAt(0).toUpperCase();
}

function shortStatus(status?: string | null) {
  if (!status) return "-";
  const map: Record<string, string> = {
    open: "OPN",
    monitoring: "MON",
    weakened: "WKN",
    closed_cut: "CUT",
    closed_full_exit: "FULL",
    partial_closed_runner: "PART",
    protected_open: "PROT",
    closed_invalidated: "INV",
    closed_runner_stop: "RSL",
  };
  return map[status] || status.slice(0, 4).toUpperCase();
}

function formatPartialCell(price?: number | null, pl?: number | null) {
  if ((price == null || !Number.isFinite(price)) && (pl == null || !Number.isFinite(pl))) return "-";
  const parts = [];
  if (price != null && Number.isFinite(price)) parts.push(formatPrice(price));
  if (pl != null && Number.isFinite(pl)) parts.push(formatPercent(pl));
  return parts.join(" · ");
}

function formatExitCell(price?: number | null, pl?: number | null) {
  return formatPartialCell(price, pl);
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

function versionBadge(active: boolean, label: string) {
  if (!active) return null;
  return (
    <span className="inline-flex min-w-[2.25rem] justify-center rounded-full border border-sky-300/70 bg-sky-300/20 px-2 py-1 text-[10px] font-semibold text-sky-50">
      {label}
    </span>
  );
}

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

export default function CryptoDashboardPage() {
  const [openPaperPositions, setOpenPaperPositions] = useState<OpenPaperPosition[]>([]);
  const [paperPositionHistory, setPaperPositionHistory] = useState<OpenPaperPosition[]>([]);
  const [v0InterestRows, setV0InterestRows] = useState<InterestRow[]>([]);
  const [interestRows, setInterestRows] = useState<InterestRow[]>([]);
  const [v2InterestRows, setV2InterestRows] = useState<InterestRow[]>([]);
  const [formationRows, setFormationRows] = useState<FormationRow[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [btcContextRows, setBtcContextRows] = useState<BtcContextRow[]>([]);
  const [serialMap, setSerialMap] = useState<Record<string, number>>({});
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
        setPaperPositionHistory(data.paperPositionHistory || []);
        setV0InterestRows(data.v0InterestRows || []);
        setInterestRows(data.interestRows || []);
        setV2InterestRows(data.v2InterestRows || []);
        setFormationRows(data.formationRows || []);
        setTrendRows(data.trendRows || []);
        setBtcContextRows(data.btcContextRows || []);
        setUpdatedAt(data.updatedAt || "");
        setNextScanAt(data.nextScanAt || "");
        scheduleNextLoad(data.nextScanAt);
      } catch (error) {
        console.error("crypto dashboard load failed", error);
        setPaperPositionHistory([]);
        setV0InterestRows([]);
        setInterestRows([]);
        setV2InterestRows([]);
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
    const source = paperPositionHistory.length > 0 ? paperPositionHistory : openPaperPositions;
    return [...source].sort((a, b) => {
      const aTime = new Date(a.entryAt).getTime();
      const bTime = new Date(b.entryAt).getTime();
      return bTime - aTime;
    });
  }, [openPaperPositions, paperPositionHistory]);

  const activePaperPositions = useMemo(() => {
    return orderedPaperPositions.filter((row) => !(row.closedAt || row.status.startsWith("closed")));
  }, [orderedPaperPositions]);

  const closedPaperPositions = useMemo(() => {
    return orderedPaperPositions.filter((row) => row.closedAt || row.status.startsWith("closed"));
  }, [orderedPaperPositions]);

  const paperPositionLabels = useMemo(() => {
    const bySymbol = new Map<string, OpenPaperPosition[]>();
    for (const row of orderedPaperPositions) {
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
  }, [orderedPaperPositions]);

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

  const versionSummaryBaseRows = useMemo(() => {
    const rows = new Map<string, {
      key: string;
      symbol: string;
      zone: string;
      rsi: number;
      price: number | null;
      detectedAt: string;
      v0: boolean;
      v1: boolean;
      v2: boolean;
      previousRsi?: number | null;
      anchorRsi?: number | null;
      anchorTime?: string | null;
      anchorPrice?: number | null;
      serialNumber?: number;
    }>();

    const upsert = (row: InterestRow, version: "v0" | "v1" | "v2") => {
      const key = `${row.symbol}:${row.zone}`;
      const existing = rows.get(key);
      const next: any = existing || {
        key,
        symbol: row.symbol,
        zone: row.zone,
        rsi: row.rsi,
        price: row.price,
        detectedAt: row.detectedAt,
        v0: false,
        v1: false,
        v2: false,
        previousRsi: row.previousRsi ?? null,
        anchorRsi: row.anchorRsi ?? null,
        anchorTime: row.anchorTime ?? null,
        anchorPrice: row.anchorPrice ?? null,
        serialNumber: row.serialNumber,
        v0Active: false,
        v1Active: false,
        v2Active: false,
      };
      next[version] = true;
      if (version === "v1" || version === "v2") next.v0 = true;

      const incomingActive = Boolean(row.currentlyInZone);
      const existingActive = Boolean(next.v0Active || next.v1Active || next.v2Active);
      const incomingSeen = parseIsoDate(row.lastSeenAt ?? row.detectedAt ?? row.firstDetectedAt);
      const existingSeen = parseIsoDate((next as any).lastSeenAt ?? next.detectedAt);
      const shouldReplaceFields = (!existingActive && incomingActive)
        || !existingSeen
        || (!!incomingSeen && incomingSeen >= existingSeen);

      if (shouldReplaceFields) {
        next.rsi = row.rsi;
        next.price = row.price;
        next.detectedAt = row.detectedAt;
        (next as any).lastSeenAt = row.lastSeenAt ?? null;
        if (typeof row.serialNumber === "number") next.serialNumber = row.serialNumber;
        if (row.previousRsi != null) next.previousRsi = row.previousRsi;
        if (row.anchorRsi != null) next.anchorRsi = row.anchorRsi;
        if (row.anchorTime != null) next.anchorTime = row.anchorTime;
        if (row.anchorPrice != null) next.anchorPrice = row.anchorPrice;
      }

      (next as any)[`${version}Active`] = incomingActive;
      rows.set(key, next);
    };

    v0InterestRows.forEach((row) => upsert(row, "v0"));
    interestRows.forEach((row) => upsert(row, "v1"));
    v2InterestRows.forEach((row) => upsert(row, "v2"));

    return [...rows.values()];
  }, [v0InterestRows, interestRows, v2InterestRows]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("rsi-version-serial-map");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setSerialMap(parsed as Record<string, number>);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setSerialMap((prev) => {
      const next = { ...prev };
      let maxSerial = Object.values(next).reduce((max, value) => Math.max(max, Number(value) || 0), 0);
      let changed = false;

      for (const row of versionSummaryBaseRows) {
        if (typeof row.serialNumber === "number") {
          if (next[row.key] !== row.serialNumber) {
            next[row.key] = row.serialNumber;
            changed = true;
          }
          maxSerial = Math.max(maxSerial, row.serialNumber);
        }
      }

      for (const row of versionSummaryBaseRows) {
        if (typeof next[row.key] !== "number") {
          maxSerial += 1;
          next[row.key] = maxSerial;
          changed = true;
        }
      }

      if (changed) {
        try {
          window.localStorage.setItem("rsi-version-serial-map", JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, [versionSummaryBaseRows]);

  const versionSummaryRows = useMemo(() => {
    return versionSummaryBaseRows
      .map((row) => ({
        ...row,
        serialNumber: typeof row.serialNumber === "number" ? row.serialNumber : serialMap[row.key],
      }))
      .sort((a, b) => {
        const aSerial = typeof a.serialNumber === "number" ? a.serialNumber : -1;
        const bSerial = typeof b.serialNumber === "number" ? b.serialNumber : -1;
        if (aSerial !== bSerial) return bSerial - aSerial;
        const versionScoreA = (a.v2 ? 4 : 0) + (a.v1 ? 2 : 0) + (a.v0 ? 1 : 0);
        const versionScoreB = (b.v2 ? 4 : 0) + (b.v1 ? 2 : 0) + (b.v0 ? 1 : 0);
        if (versionScoreA !== versionScoreB) return versionScoreB - versionScoreA;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [versionSummaryBaseRows, serialMap]);

  const btcContextDisplayRows = useMemo(() => {
    return btcContextRows;
  }, [btcContextRows]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-3 py-4 md:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">RAI Crypto Dashboard</h1>
            <p className="text-sm text-slate-300">4H radar: version matrix pentru RSI Interest Zones</p>
          </div>
          <div className="text-xs leading-5 text-slate-200">
            <p>Status: dashboard simplified</p>
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
            <p>Next scan: {nextScanAt ? new Date(nextScanAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">RSI Version Matrix</h2>
            <span className="text-[10px] text-slate-400">V0 / V1 / V2 pe aceeași monedă</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Nr.</th>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">RSI now</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Zone</th>
                  <th className="px-4 py-3 text-left">Detected</th>
                  <th className="px-4 py-3 text-left">V0</th>
                  <th className="px-4 py-3 text-left">V1</th>
                  <th className="px-4 py-3 text-left">V2</th>
                  <th className="px-4 py-3 text-left">Anchor RSI</th>
                  <th className="px-4 py-3 text-left">Anchor price</th>
                  <th className="px-4 py-3 text-left">Anchor time</th>
                  <th className="px-4 py-3 text-left">Prev RSI</th>
                </tr>
              </thead>
              <tbody>
                {versionSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-4 text-slate-400">No coins in tracked RSI versions right now.</td>
                  </tr>
                ) : (
                  versionSummaryRows.map((row) => (
                    <tr key={`${row.symbol}-${row.zone}`} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold text-slate-400">{row.serialNumber ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                      <td className="px-4 py-3">{row.rsi.toFixed(2)}</td>
                      <td className="px-4 py-3">{formatPrice(row.price)}</td>
                      <td className="px-4 py-3">{zoneLabel(row.zone)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.detectedAt)}</td>
                      <td className="px-4 py-3">{versionBadge(row.v0, "V0")}</td>
                      <td className="px-4 py-3">{versionBadge(row.v1, "V1")}</td>
                      <td className="px-4 py-3">{versionBadge(row.v2, "V2")}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.anchorRsi != null ? row.anchorRsi.toFixed(2) : "-"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{formatPrice(row.anchorPrice)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.anchorTime ? formatCompactDate(row.anchorTime) : "-"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">{row.previousRsi != null ? row.previousRsi.toFixed(2) : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 grid gap-2 md:grid-cols-3">
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">V0 rows</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{v0InterestRows.length}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">V1 rows</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{interestRows.length}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">V2 rows</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{v2InterestRows.length}</p>
          </div>
        </section>

        <section className="mb-4 grid gap-2 md:grid-cols-3">
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paper history</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{orderedPaperPositions.length}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active positions</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{activePaperPositions.length}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Closed positions</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{closedPaperPositions.length}</p>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Paper Positions — Active</h2>
            <span className="text-[10px] text-slate-400">history-backed when live engine is off</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-left">Entry</th>
                  <th className="px-4 py-3 text-left">Current</th>
                  <th className="px-4 py-3 text-left">Current P/L</th>
                  <th className="px-4 py-3 text-left">Best</th>
                  <th className="px-4 py-3 text-left">Worst</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Runner stop</th>
                  <th className="px-4 py-3 text-left">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {activePaperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-slate-400">No active paper positions.</td>
                  </tr>
                ) : (
                  activePaperPositions.map((row) => {
                    const key = `${row.symbol}-${row.side}-${row.entryAt}`;
                    const currentPl = computePlValue(row.entryPrice, row.currentPrice, row.side);
                    return (
                      <tr key={key} className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(key) || row.symbol}</td>
                        <td className="px-4 py-3">{shortSide(row.side)}</td>
                        <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                        <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                        <td className={`px-4 py-3 font-semibold ${percentTextClass(currentPl)}`}>{formatPL(row.entryPrice, row.currentPrice, row.side)}</td>
                        <td className={`px-4 py-3 ${percentTextClass(row.maxPlPercent ?? null)}`}>{formatPercent(row.maxPlPercent)}</td>
                        <td className={`px-4 py-3 ${percentTextClass(row.minPlPercent ?? null)}`}>{formatPercent(row.minPlPercent)}</td>
                        <td className="px-4 py-3">{shortStatus(row.status)}</td>
                        <td className="px-4 py-3">{formatPrice(row.runnerStopPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.lastSeenAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${shellClass} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Paper Positions — Closed</h2>
            <span className="text-[10px] text-slate-400">kept visible for learning continuity</span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Coin</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-left">Entry</th>
                  <th className="px-4 py-3 text-left">Exit</th>
                  <th className="px-4 py-3 text-left">Partial</th>
                  <th className="px-4 py-3 text-left">Close P/L</th>
                  <th className="px-4 py-3 text-left">Best</th>
                  <th className="px-4 py-3 text-left">Worst</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedPaperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-slate-400">No closed paper positions yet.</td>
                  </tr>
                ) : (
                  closedPaperPositions.map((row) => {
                    const key = `${row.symbol}-${row.side}-${row.entryAt}`;
                    return (
                      <tr key={key} className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(key) || row.symbol}</td>
                        <td className="px-4 py-3">{shortSide(row.side)}</td>
                        <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                        <td className="px-4 py-3">{formatExitCell(row.closePrice, row.closePlPercent)}</td>
                        <td className="px-4 py-3">{formatPartialCell(row.partialClosePrice, row.partialClosePlPercent)}</td>
                        <td className={`px-4 py-3 font-semibold ${percentTextClass(row.closePlPercent ?? null)}`}>{formatPercent(row.closePlPercent)}</td>
                        <td className={`px-4 py-3 ${percentTextClass(row.maxPlPercent ?? null)}`}>{formatPercent(row.maxPlPercent)}</td>
                        <td className={`px-4 py-3 ${percentTextClass(row.minPlPercent ?? null)}`}>{formatPercent(row.minPlPercent)}</td>
                        <td className="px-4 py-3">{shortStatus(row.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.closedAt)}</td>
                      </tr>
                    );
                  })
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tracked coins</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{versionSummaryRows.length}</p>
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

      </div>
    </main>
  );
}
