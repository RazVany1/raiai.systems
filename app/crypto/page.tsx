"use client";

import { useEffect, useMemo, useState } from "react";

type OpenPaperPosition = {
  symbol: string;
  side: string;
  entryPrice: number | null;
  entryAt: string;
  entryState: string;
  entrySignal?: string;
  entrySystem?: string;
  signalZone?: string;
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

type PositionSnapshot = {
  scanAt: string;
  currentPrice?: number | null;
  currentPlPercent?: number | null;
  candleClose4h?: number | null;
  candleClose1h?: number | null;
};

type PositionSnapshotBucket = {
  symbol: string;
  side: string;
  entryAt: string;
  entryPrice?: number | null;
  snapshots?: PositionSnapshot[];
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

function snapshotDisplayPrice(snapshot?: PositionSnapshot | null) {
  if (!snapshot) return null;
  if (typeof snapshot.currentPrice === "number" && Number.isFinite(snapshot.currentPrice)) return snapshot.currentPrice;
  if (typeof snapshot.candleClose4h === "number" && Number.isFinite(snapshot.candleClose4h)) return snapshot.candleClose4h;
  if (typeof snapshot.candleClose1h === "number" && Number.isFinite(snapshot.candleClose1h)) return snapshot.candleClose1h;
  return null;
}

const ASSUMED_MARGIN_USD = 10;
const ASSUMED_LEVERAGE = 5;
const ASSUMED_NOTIONAL_USD = ASSUMED_MARGIN_USD * ASSUMED_LEVERAGE;

function formatPL(entryPrice?: number | null, currentPrice?: number | null, side?: string) {
  return formatPercent(computePlValue(entryPrice, currentPrice, side));
}

function plUsdFromPercent(percent?: number | null) {
  if (percent == null || !Number.isFinite(percent)) return null;
  return (ASSUMED_NOTIONAL_USD * percent) / 100;
}

function equityUsdFromPercent(percent?: number | null) {
  const pnlUsd = plUsdFromPercent(percent);
  if (pnlUsd == null) return null;
  return ASSUMED_MARGIN_USD + pnlUsd;
}

function formatUsd(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatCompactDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
}

const SCAN_INTERVAL_MINUTES = 30;

function systemTrackedBars(system?: string | null) {
  if (system === "S1h") return 40;
  return 20;
}

function systemBarHours(system?: string | null) {
  if (system === "S1h") return 1;
  if (system === "S4h") return 4;
  if (system === "S1D") return 24;
  return null;
}

function systemScanSlots(system?: string | null) {
  const barHours = systemBarHours(system);
  if (!barHours) return null;
  return (barHours * 60) / SCAN_INTERVAL_MINUTES;
}

function barsProgressValue(entryAt?: string | null, system?: string | null, updatedAt?: string | null) {
  const barHours = systemBarHours(system);
  const entryDate = parseIsoDate(entryAt);
  const updatedDate = parseIsoDate(updatedAt);
  if (!barHours || !entryDate || !updatedDate) return null;
  const elapsedMs = Math.max(0, updatedDate.getTime() - entryDate.getTime());
  return Math.floor(elapsedMs / (barHours * 60 * 60 * 1000)) + 1;
}

function barsProgressLabel(entryAt?: string | null, system?: string | null, updatedAt?: string | null) {
  const bars = barsProgressValue(entryAt, system, updatedAt);
  if (bars == null) return "-";
  const trackedBars = systemTrackedBars(system);
  return `${Math.min(bars, trackedBars)}/${trackedBars}`;
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shortSide(side?: string | null) {
  if (!side) return "-";
  return side === "SHORT" ? "SHORT" : side === "LONG" ? "LONG" : side.toUpperCase();
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

function buildVersionSummaryBaseRows(v0Rows: InterestRow[], v1Rows: InterestRow[], v2Rows: InterestRow[], v3Rows: InterestRow[] = []) {
  const rows = new Map<string, any>();

  const upsert = (row: InterestRow, version: "v0" | "v1" | "v2" | "v3") => {
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
      v3: false,
      previousRsi: row.previousRsi ?? null,
      anchorRsi: row.anchorRsi ?? null,
      anchorTime: row.anchorTime ?? null,
      anchorPrice: row.anchorPrice ?? null,
      v0Active: false,
      v1Active: false,
      v2Active: false,
      v3Active: false,
    };
    next[version] = true;
    if (version === "v1" || version === "v2" || version === "v3") next.v0 = true;

    const incomingActive = Boolean(row.currentlyInZone);
    const existingActive = Boolean(next.v0Active || next.v1Active || next.v2Active || next.v3Active);
    const incomingSeen = parseIsoDate(row.lastSeenAt ?? row.detectedAt ?? row.firstDetectedAt);
    const existingSeen = parseIsoDate(next.lastSeenAt ?? next.detectedAt);
    const shouldReplaceFields = (!existingActive && incomingActive)
      || !existingSeen
      || (!!incomingSeen && incomingSeen >= existingSeen);

    if (shouldReplaceFields) {
      next.rsi = row.rsi;
      next.price = row.price;
      next.detectedAt = row.detectedAt;
      next.lastSeenAt = row.lastSeenAt ?? null;
      if (row.previousRsi != null) next.previousRsi = row.previousRsi;
      if (row.anchorRsi != null) next.anchorRsi = row.anchorRsi;
      if (row.anchorTime != null) next.anchorTime = row.anchorTime;
      if (row.anchorPrice != null) next.anchorPrice = row.anchorPrice;
    }

    next[`${version}Active`] = incomingActive;
    rows.set(key, next);
  };

  v0Rows.forEach((row) => upsert(row, "v0"));
  v1Rows.forEach((row) => upsert(row, "v1"));
  v2Rows.forEach((row) => upsert(row, "v2"));
  v3Rows.forEach((row) => upsert(row, "v3"));

  return [...rows.values()];
}

function versionBadge(active: boolean, label: string) {
  if (!active) return null;
  return (
    <span className="inline-flex min-w-[2.25rem] justify-center rounded-full border border-sky-300/70 bg-sky-300/20 px-2 py-1 text-[10px] font-semibold text-sky-50">
      {label}
    </span>
  );
}

function entrySignalBadge(row: OpenPaperPosition) {
  if (row.entrySignal !== "RSI_V3") return null;
  const system = row.entrySystem === "S1h" ? "1h" : row.entrySystem === "S4h" ? "4h" : row.entrySystem === "S1D" ? "1d" : (row.entrySystem || "?").replace(/^S/i, "");
  return (
    <span className="inline-flex rounded-full border border-emerald-300/50 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
      {system}
    </span>
  );
}

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

function MatrixSection({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: any[];
  emptyText: string;
}) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-[10px] text-slate-400">V0 / V1 / V2 / V3 pe aceeasi moneda</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Coin</th>
              <th className="px-4 py-3 text-left">RSI now</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Zone</th>
              <th className="px-4 py-3 text-left">Detected</th>
              <th className="px-4 py-3 text-left">V0</th>
              <th className="px-4 py-3 text-left">V1</th>
              <th className="px-4 py-3 text-left">V2</th>
              <th className="px-4 py-3 text-left">V3</th>
              <th className="px-4 py-3 text-left">Anchor RSI</th>
              <th className="px-4 py-3 text-left">Anchor price</th>
              <th className="px-4 py-3 text-left">Anchor time</th>
              <th className="px-4 py-3 text-left">Prev RSI</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-4 text-slate-400">{emptyText}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.symbol}-${row.zone}`} className="border-t border-white/10">
                  <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                  <td className="px-4 py-3">{row.rsi.toFixed(2)}</td>
                  <td className="px-4 py-3">{formatPrice(row.price)}</td>
                  <td className="px-4 py-3">{zoneLabel(row.zone)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.detectedAt)}</td>
                  <td className="px-4 py-3">{versionBadge(row.v0, "V0")}</td>
                  <td className="px-4 py-3">{versionBadge(row.v1, "V1")}</td>
                  <td className="px-4 py-3">{versionBadge(row.v2, "V2")}</td>
                  <td className="px-4 py-3">{versionBadge(Boolean((row as any).v3), "V3")}</td>
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
  );
}

function VersionsLegendSection() {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">RSI Versions - Legend</h2>
        <span className="text-[10px] text-slate-400">cum se citeste V0 / V1 / V2 / V3</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-left">Meaning</th>
              <th className="px-4 py-3 text-left">Upper zone</th>
              <th className="px-4 py-3 text-left">Lower zone</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10"><td className="px-4 py-3 font-semibold text-slate-100">V0</td><td className="px-4 py-3">coin in tracked RSI interest context</td><td className="px-4 py-3">upper interest context</td><td className="px-4 py-3">lower interest context</td></tr>
            <tr className="border-t border-white/10"><td className="px-4 py-3 font-semibold text-slate-100">V1</td><td className="px-4 py-3">valid anchor exists</td><td className="px-4 py-3">anchor RSI &gt; 77</td><td className="px-4 py-3">anchor RSI &lt; 23</td></tr>
            <tr className="border-t border-white/10"><td className="px-4 py-3 font-semibold text-slate-100">V2</td><td className="px-4 py-3">anchor - reset - return confirmed</td><td className="px-4 py-3">drops under 60 then returns to 68-72</td><td className="px-4 py-3">rises above 40 then returns to 28-32</td></tr>
            <tr className="border-t border-white/10"><td className="px-4 py-3 font-semibold text-slate-100">V3</td><td className="px-4 py-3">V2 + live price vs anchor price</td><td className="px-4 py-3">price now &gt; anchor price</td><td className="px-4 py-3">price now &lt; anchor price</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActivePositionsSection({
  title,
  subtitle,
  rows,
  updatedAt,
  paperPositionLabels,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: OpenPaperPosition[];
  updatedAt: string;
  paperPositionLabels: Map<string, string>;
  emptyText: string;
}) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-[10px] text-slate-400">{subtitle}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Coin</th>
              <th className="px-4 py-3 text-left">System</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-left">Entry</th>
              <th className="px-4 py-3 text-left">20 bars</th>
              <th className="px-4 py-3 text-left">Current</th>
              <th className="px-4 py-3 text-left">Current P/L</th>
              <th className="px-4 py-3 text-left">P/L $</th>
              <th className="px-4 py-3 text-left">Money on pos.</th>
              <th className="px-4 py-3 text-left">Best</th>
              <th className="px-4 py-3 text-left">Worst</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Runner stop</th>
              <th className="px-4 py-3 text-left">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-4 text-slate-400">{emptyText}</td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = `${row.symbol}-${row.side}-${row.entryAt}`;
                const currentPl = computePlValue(row.entryPrice, row.currentPrice, row.side);
                return (
                  <tr key={key} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(key) || row.symbol}</td>
                    <td className="px-4 py-3">{entrySignalBadge(row) || (row.entrySystem || "-")}</td>
                    <td className="px-4 py-3">{shortSide(row.side)}</td>
                    <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                    <td className="px-4 py-3">{barsProgressLabel(row.entryAt, row.entrySystem, row.lastSeenAt || updatedAt)}</td>
                    <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                    <td className={`px-4 py-3 font-semibold ${percentTextClass(currentPl)}`}>{formatPL(row.entryPrice, row.currentPrice, row.side)}</td>
                    <td className={`px-4 py-3 font-semibold ${percentTextClass(currentPl)}`}>{formatUsd(plUsdFromPercent(currentPl))}</td>
                    <td className={`px-4 py-3 font-semibold ${percentTextClass(currentPl)}`}>{formatUsd(equityUsdFromPercent(currentPl))}</td>
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
  );
}

function BarEvolutionSection({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: any[];
  emptyText: string;
}) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-[10px] text-slate-400">{subtitle}</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-950/25 px-4 py-4 text-sm text-slate-400">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ key, row, progress, trackedBars, maxScans, slotsPerBar, scanSeries, minPrice, maxPrice, bestPoint, worstPoint, currentPoint }) => {
            const width = 1200;
            const height = 260;
            const paddingX = 18;
            const paddingTop = 18;
            const paddingBottom = 28;
            const plotWidth = width - paddingX * 2;
            const plotHeight = height - paddingTop - paddingBottom;
            const priceRange = minPrice != null && maxPrice != null ? Math.max(maxPrice - minPrice, (maxPrice || 1) * 0.002) : 1;
            const valueToY = (value: number) => paddingTop + ((maxPrice ?? value) - value) / priceRange * plotHeight;
            const scanToX = (scanIndex: number) => paddingX + ((scanIndex - 1) / Math.max(maxScans - 1, 1)) * plotWidth;
            const linePoints = scanSeries.map((point: any) => `${scanToX(point.scanIndex)},${valueToY(point.price)}`).join(" ");
            const entryY = row.entryPrice != null && minPrice != null && maxPrice != null ? valueToY(row.entryPrice) : null;
            const barMarkers = Array.from({ length: trackedBars }, (_, index) => {
              const scanIndex = index * Math.max(slotsPerBar, 1) + 1;
              return { bar: index + 1, x: scanToX(scanIndex) };
            });

            return (
              <div key={`evolution-${key}`} className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-white">{row.symbol}</span>
                  <span>{entrySignalBadge(row) || (row.entrySystem || "-")}</span>
                  <span>{shortSide(row.side)}</span>
                  <span>Entry {formatPrice(row.entryPrice)}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">{progress}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">{maxScans} scans max</span>
                  <span className={`rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold shadow-sm ${bestPoint?.pl != null && bestPoint.pl > 0 ? "bg-emerald-400/18 text-emerald-100" : "bg-white/[0.05] text-slate-200"}`}>Best {bestPoint ? `B${bestPoint.bar} ${formatPercent(bestPoint.pl)}` : "-"}</span>
                  <span className={`rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold shadow-sm ${worstPoint?.pl != null && worstPoint.pl < 0 ? "bg-rose-400/18 text-rose-100" : "bg-white/[0.05] text-slate-200"}`}>Worst {worstPoint ? `B${worstPoint.bar} ${formatPercent(worstPoint.pl)}` : "-"}</span>
                  <span className={`rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold shadow-sm ${percentTextClass(currentPoint?.pl)}`}>Current {currentPoint ? formatPercent(currentPoint.pl) : "-"}</span>
                </div>
                <div className="min-w-[1200px] rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
                    <rect x="0" y="0" width={width} height={height} rx="10" fill="rgba(15,23,42,0.35)" />
                    {entryY != null ? <rect x={paddingX} y={paddingTop} width={plotWidth} height={Math.max(0, entryY - paddingTop)} fill={row.side === "SHORT" ? "rgba(244,63,94,0.05)" : "rgba(16,185,129,0.05)"} /> : null}
                    {entryY != null ? <rect x={paddingX} y={entryY} width={plotWidth} height={Math.max(0, paddingTop + plotHeight - entryY)} fill={row.side === "SHORT" ? "rgba(16,185,129,0.05)" : "rgba(244,63,94,0.05)"} /> : null}
                    {barMarkers.map((marker) => (
                      <g key={`${key}-marker-${marker.bar}`}>
                        <line x1={marker.x} y1={paddingTop} x2={marker.x} y2={paddingTop + plotHeight} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 5" />
                        <text x={marker.x + 2} y={height - 8} fill="rgba(148,163,184,0.8)" fontSize="10">B{marker.bar}</text>
                      </g>
                    ))}
                    {entryY != null ? <g><line x1={paddingX} y1={entryY} x2={paddingX + plotWidth} y2={entryY} stroke="rgba(250,204,21,0.8)" strokeDasharray="6 4" /><text x={paddingX + 6} y={Math.max(12, entryY - 6)} fill="rgba(250,204,21,0.95)" fontSize="11">Entry {formatPrice(row.entryPrice)}</text></g> : null}
                    {linePoints ? <polyline fill="none" stroke="rgba(125,211,252,0.95)" strokeWidth="2.5" points={linePoints} /> : null}
                    {scanSeries.map((point: any) => <circle key={`${key}-scan-${point.scanIndex}`} cx={scanToX(point.scanIndex)} cy={valueToY(point.price)} r="2.5" fill={point.pl != null && point.pl >= 0 ? "rgba(52,211,153,0.9)" : "rgba(251,113,133,0.9)"} />)}
                    {bestPoint ? <circle cx={scanToX(bestPoint.scanIndex)} cy={valueToY(bestPoint.price)} r="5" fill="rgba(16,185,129,1)" stroke="white" strokeWidth="1.5" /> : null}
                    {worstPoint ? <circle cx={scanToX(worstPoint.scanIndex)} cy={valueToY(worstPoint.price)} r="5" fill="rgba(244,63,94,1)" stroke="white" strokeWidth="1.5" /> : null}
                    {currentPoint ? <circle cx={scanToX(currentPoint.scanIndex)} cy={valueToY(currentPoint.price)} r="4.5" fill="rgba(255,255,255,0.95)" stroke="rgba(59,130,246,0.9)" strokeWidth="1.5" /> : null}
                  </svg>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-4">
                    <div>Scans captured: <span className="font-semibold text-slate-100">{scanSeries.length}/{maxScans}</span></div>
                    <div>Price range: <span className="font-semibold text-slate-100">{minPrice != null && maxPrice != null ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}` : "-"}</span></div>
                    <div>Best point: <span className="font-semibold text-emerald-200">{bestPoint ? `scan ${bestPoint.scanIndex} - ${formatPrice(bestPoint.price)}` : "-"}</span></div>
                    <div>Worst point: <span className="font-semibold text-rose-200">{worstPoint ? `scan ${worstPoint.scanIndex} - ${formatPrice(worstPoint.price)}` : "-"}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function CryptoDashboardPage() {
  const [openPaperPositions, setOpenPaperPositions] = useState<OpenPaperPosition[]>([]);
  const [paperPositionHistory, setPaperPositionHistory] = useState<OpenPaperPosition[]>([]);
  const [v0InterestRows, setV0InterestRows] = useState<InterestRow[]>([]);
  const [interestRows, setInterestRows] = useState<InterestRow[]>([]);
  const [v2InterestRows, setV2InterestRows] = useState<InterestRow[]>([]);
  const [v3InterestRows, setV3InterestRows] = useState<InterestRow[]>([]);
  const [v0InterestRows1h, setV0InterestRows1h] = useState<InterestRow[]>([]);
  const [interestRows1h, setInterestRows1h] = useState<InterestRow[]>([]);
  const [v2InterestRows1h, setV2InterestRows1h] = useState<InterestRow[]>([]);
  const [v3InterestRows1h, setV3InterestRows1h] = useState<InterestRow[]>([]);
  const [v0InterestRows1d, setV0InterestRows1d] = useState<InterestRow[]>([]);
  const [interestRows1d, setInterestRows1d] = useState<InterestRow[]>([]);
  const [v2InterestRows1d, setV2InterestRows1d] = useState<InterestRow[]>([]);
  const [v3InterestRows1d, setV3InterestRows1d] = useState<InterestRow[]>([]);
  const [formationRows, setFormationRows] = useState<FormationRow[]>([]);
  const [trendRows, setTrendRows] = useState<TrendRow[]>([]);
  const [btcContextRows, setBtcContextRows] = useState<BtcContextRow[]>([]);
  const [positionSnapshots, setPositionSnapshots] = useState<Record<string, PositionSnapshotBucket>>({});
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [nextScanAt, setNextScanAt] = useState<string>("");
  const [scanUniverseExpected, setScanUniverseExpected] = useState<number>(0);

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
        setV3InterestRows(data.v3InterestRows || []);
        setV0InterestRows1h(data.v0InterestRows1h || []);
        setInterestRows1h(data.interestRows1h || []);
        setV2InterestRows1h(data.v2InterestRows1h || []);
        setV3InterestRows1h(data.v3InterestRows1h || []);
        setV0InterestRows1d(data.v0InterestRows1d || []);
        setInterestRows1d(data.interestRows1d || []);
        setV2InterestRows1d(data.v2InterestRows1d || []);
        setV3InterestRows1d(data.v3InterestRows1d || []);
        setFormationRows(data.formationRows || []);
        setTrendRows(data.trendRows || []);
        setBtcContextRows(data.btcContextRows || []);
        setPositionSnapshots(data.positionSnapshots || {});
        setUpdatedAt(data.updatedAt || "");
        setNextScanAt(data.nextScanAt || "");
        setScanUniverseExpected(Number.isFinite(data.scanUniverseExpected) ? data.scanUniverseExpected : 0);
        scheduleNextLoad(data.nextScanAt);
      } catch (error) {
        console.error("crypto dashboard load failed", error);
        setPaperPositionHistory([]);
        setV0InterestRows([]);
        setInterestRows([]);
        setV2InterestRows([]);
        setV3InterestRows([]);
        setV0InterestRows1h([]);
        setInterestRows1h([]);
        setV2InterestRows1h([]);
        setV3InterestRows1h([]);
        setV0InterestRows1d([]);
        setInterestRows1d([]);
        setV2InterestRows1d([]);
        setV3InterestRows1d([]);
        setFormationRows([]);
        setTrendRows([]);
        setBtcContextRows([]);
        setPositionSnapshots({});
        setScanUniverseExpected(0);
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

  const orderedOpenPaperPositions = useMemo(() => {
    return [...openPaperPositions].sort((a, b) => {
      const aTime = new Date(a.entryAt).getTime();
      const bTime = new Date(b.entryAt).getTime();
      return bTime - aTime;
    });
  }, [openPaperPositions]);

  const orderedHistoryPaperPositions = useMemo(() => {
    return [...paperPositionHistory].sort((a, b) => {
      const aTime = new Date(a.entryAt).getTime();
      const bTime = new Date(b.entryAt).getTime();
      return bTime - aTime;
    });
  }, [paperPositionHistory]);

  const activePaperPositions = useMemo(() => {
    return orderedOpenPaperPositions.filter((row) => !(row.closedAt || row.status.startsWith("closed")));
  }, [orderedOpenPaperPositions]);

  const closedPaperPositions = useMemo(() => {
    return orderedHistoryPaperPositions.filter((row) => row.closedAt || row.status.startsWith("closed"));
  }, [orderedHistoryPaperPositions]);

  const openMoneySummary = useMemo(() => {
    const pnlUsd = activePaperPositions.reduce((sum, row) => {
      const currentPl = computePlValue(row.entryPrice, row.currentPrice, row.side);
      return sum + (plUsdFromPercent(currentPl) ?? 0);
    }, 0);
    return {
      positions: activePaperPositions.length,
      marginUsd: activePaperPositions.length * ASSUMED_MARGIN_USD,
      notionalUsd: activePaperPositions.length * ASSUMED_NOTIONAL_USD,
      pnlUsd,
      equityUsd: activePaperPositions.length * ASSUMED_MARGIN_USD + pnlUsd,
    };
  }, [activePaperPositions]);

  const closedMoneySummary = useMemo(() => {
    const pnlUsd = closedPaperPositions.reduce((sum, row) => sum + (plUsdFromPercent(row.closePlPercent ?? null) ?? 0), 0);
    return {
      positions: closedPaperPositions.length,
      marginUsd: closedPaperPositions.length * ASSUMED_MARGIN_USD,
      notionalUsd: closedPaperPositions.length * ASSUMED_NOTIONAL_USD,
      pnlUsd,
      equityUsd: closedPaperPositions.length * ASSUMED_MARGIN_USD + pnlUsd,
    };
  }, [closedPaperPositions]);

  const paperPositionLabels = useMemo(() => {
    const bySymbol = new Map<string, OpenPaperPosition[]>();
    for (const row of [...orderedOpenPaperPositions, ...orderedHistoryPaperPositions]) {
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
  }, [orderedOpenPaperPositions, orderedHistoryPaperPositions]);

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

  const versionSummaryBaseRows = useMemo(() => buildVersionSummaryBaseRows(v0InterestRows, interestRows, v2InterestRows, v3InterestRows), [v0InterestRows, interestRows, v2InterestRows, v3InterestRows]);

  const versionSummaryBaseRows1h = useMemo(() => buildVersionSummaryBaseRows(v0InterestRows1h, interestRows1h, v2InterestRows1h, v3InterestRows1h), [v0InterestRows1h, interestRows1h, v2InterestRows1h, v3InterestRows1h]);

  const versionSummaryBaseRows1d = useMemo(() => buildVersionSummaryBaseRows(v0InterestRows1d, interestRows1d, v2InterestRows1d, v3InterestRows1d), [v0InterestRows1d, interestRows1d, v2InterestRows1d, v3InterestRows1d]);

  const versionSummaryRows = useMemo(() => {
    return versionSummaryBaseRows
      .filter((row) => row.v2 || row.v3)
      .sort((a, b) => {
        const aIsLatest = a.lastSeenAt === updatedAt || a.detectedAt === updatedAt;
        const bIsLatest = b.lastSeenAt === updatedAt || b.detectedAt === updatedAt;
        if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [versionSummaryBaseRows, updatedAt]);

  const versionSummaryRows1h = useMemo(() => {
    return versionSummaryBaseRows1h
      .filter((row) => row.v2 || row.v3)
      .sort((a, b) => {
        const aIsLatest = a.lastSeenAt === updatedAt || a.detectedAt === updatedAt;
        const bIsLatest = b.lastSeenAt === updatedAt || b.detectedAt === updatedAt;
        if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [versionSummaryBaseRows1h, updatedAt]);

  const versionSummaryRows1d = useMemo(() => {
    return versionSummaryBaseRows1d
      .filter((row) => row.v2 || row.v3)
      .sort((a, b) => {
        const aIsLatest = a.lastSeenAt === updatedAt || a.detectedAt === updatedAt;
        const bIsLatest = b.lastSeenAt === updatedAt || b.detectedAt === updatedAt;
        if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [versionSummaryBaseRows1d, updatedAt]);

  const scanSummary = useMemo(() => {
    const scanned = new Set(
      trendRows
        .map((row) => row.symbol)
        .filter((symbol) => symbol && symbol !== "BTC.D"),
    ).size;

    const visible = new Set([
      ...versionSummaryRows.map((row) => row.symbol),
      ...versionSummaryRows1h.map((row) => row.symbol),
      ...versionSummaryRows1d.map((row) => row.symbol),
    ]).size;

    const hiddenV0 = new Set(
      [...versionSummaryBaseRows, ...versionSummaryBaseRows1h, ...versionSummaryBaseRows1d]
        .filter((row) => row.v0 && !row.v1 && !row.v2 && !row.v3)
        .map((row) => row.symbol),
    ).size;

    const expected = scanUniverseExpected > 0 ? scanUniverseExpected : scanned;
    return { expected, scanned, visible, hiddenV0, healthy: scanned >= expected };
  }, [scanUniverseExpected, trendRows, versionSummaryRows, versionSummaryRows1h, versionSummaryRows1d, versionSummaryBaseRows, versionSummaryBaseRows1h, versionSummaryBaseRows1d]);

  const openPositionEvolutionRows = useMemo(() => {
    return activePaperPositions.map((row) => {
      const key = `${row.symbol}:${row.side}:${row.entryAt}`;
      const bucket = positionSnapshots[key];
      const barHours = systemBarHours(row.entrySystem);
      const entryDate = parseIsoDate(row.entryAt);
      const slotsPerBar = systemScanSlots(row.entrySystem) || 0;
      const trackedBars = systemTrackedBars(row.entrySystem);
      const maxScans = slotsPerBar * trackedBars;
      const snapshots = (Array.isArray(bucket?.snapshots) ? bucket.snapshots : [])
        .filter((snapshot) => snapshotDisplayPrice(snapshot) != null)
        .sort((a, b) => (parseIsoDate(a.scanAt)?.getTime() || 0) - (parseIsoDate(b.scanAt)?.getTime() || 0));

      const scanSeries = snapshots
        .map((snapshot) => {
          const scanDate = parseIsoDate(snapshot.scanAt);
          const price = snapshotDisplayPrice(snapshot);
          if (!entryDate || !scanDate || price == null || !barHours) return null;
          const elapsedMinutes = Math.max(0, (scanDate.getTime() - entryDate.getTime()) / (60 * 1000));
          const scanIndex = Math.floor(elapsedMinutes / SCAN_INTERVAL_MINUTES) + 1;
          if (scanIndex < 1 || scanIndex > maxScans) return null;
          const bar = Math.floor((scanIndex - 1) / Math.max(slotsPerBar, 1)) + 1;
          return {
            scanAt: snapshot.scanAt,
            scanIndex,
            bar,
            price,
            pl: computePlValue(row.entryPrice, price, row.side),
          };
        })
        .filter((item): item is { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null } => Boolean(item));

      const priceValues = [
        ...(row.entryPrice != null && Number.isFinite(row.entryPrice) ? [row.entryPrice] : []),
        ...scanSeries.map((point) => point.price),
      ];
      const minPrice = priceValues.length ? Math.min(...priceValues) : null;
      const maxPrice = priceValues.length ? Math.max(...priceValues) : null;
      const bestPoint = scanSeries.reduce((best, point) => {
        if (point.pl == null) return best;
        if (!best || point.pl > best.pl) return point;
        return best;
      }, null as (typeof scanSeries)[number] | null);
      const worstPoint = scanSeries.reduce((worst, point) => {
        if (point.pl == null) return worst;
        if (!worst || point.pl < worst.pl) return point;
        return worst;
      }, null as (typeof scanSeries)[number] | null);
      const currentPoint = scanSeries.length ? scanSeries[scanSeries.length - 1] : null;

      return {
        key,
        row,
        progress: barsProgressLabel(row.entryAt, row.entrySystem, row.lastSeenAt || updatedAt),
        trackedBars,
        maxScans,
        slotsPerBar,
        scanSeries,
        minPrice,
        maxPrice,
        bestPoint,
        worstPoint,
        currentPoint,
      };
    });
  }, [activePaperPositions, positionSnapshots, updatedAt]);

  const activePaperPositions1d = useMemo(() => activePaperPositions.filter((row) => row.entrySystem === "S1D"), [activePaperPositions]);
  const activePaperPositions4h = useMemo(() => activePaperPositions.filter((row) => row.entrySystem === "S4h"), [activePaperPositions]);
  const activePaperPositions1h = useMemo(() => activePaperPositions.filter((row) => row.entrySystem === "S1h"), [activePaperPositions]);

  const openPositionEvolutionRows1d = useMemo(() => openPositionEvolutionRows.filter(({ row }) => row.entrySystem === "S1D"), [openPositionEvolutionRows]);
  const openPositionEvolutionRows4h = useMemo(() => openPositionEvolutionRows.filter(({ row }) => row.entrySystem === "S4h"), [openPositionEvolutionRows]);
  const openPositionEvolutionRows1h = useMemo(() => openPositionEvolutionRows.filter(({ row }) => row.entrySystem === "S1h"), [openPositionEvolutionRows]);

  const btcContextDisplayRows = useMemo(() => {
    return btcContextRows;
  }, [btcContextRows]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-3 py-4 md:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">RAI Crypto Dashboard</h1>
            <p className="text-sm text-slate-300">S1D + S4h + S1h radar: version matrix, active paper positions și bar evolution pe fiecare sistem</p>
          </div>
          <div className="text-xs leading-5 text-slate-200">
            <p>Status: dashboard simplified</p>
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
            <p>Next scan: {nextScanAt ? new Date(nextScanAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <section className="mb-4 grid gap-2 md:grid-cols-4">
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open notional</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{formatUsd(openMoneySummary.notionalUsd)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{openMoneySummary.positions} pozitii x $50</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open P/L $</p>
            <p className={`mt-2 text-lg font-semibold ${percentTextClass(openMoneySummary.pnlUsd)}`}>{formatUsd(openMoneySummary.pnlUsd)}</p>
            <p className="mt-1 text-[11px] text-slate-400">marja initiala {formatUsd(openMoneySummary.marginUsd)}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open money now</p>
            <p className={`mt-2 text-lg font-semibold ${percentTextClass(openMoneySummary.pnlUsd)}`}>{formatUsd(openMoneySummary.equityUsd)}</p>
            <p className="mt-1 text-[11px] text-slate-400">capital activ estimat</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Closed P/L $</p>
            <p className={`mt-2 text-lg font-semibold ${percentTextClass(closedMoneySummary.pnlUsd)}`}>{formatUsd(closedMoneySummary.pnlUsd)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{closedMoneySummary.positions} pozitii inchise</p>
          </div>
        </section>

        <VersionsLegendSection />

        <MatrixSection
          title="S1D - RSI Version Matrix"
          rows={versionSummaryRows1d}
          emptyText="No coins in tracked S1D RSI versions right now."
        />

        <MatrixSection
          title="S4h - RSI Version Matrix"
          rows={versionSummaryRows}
          emptyText="No coins in tracked S4h RSI versions right now."
        />

        <MatrixSection
          title="S1h - RSI Version Matrix"
          rows={versionSummaryRows1h}
          emptyText="No coins in tracked S1h RSI versions right now."
        />

        <ActivePositionsSection
          title="S1D - Paper Positions - Active"
          subtitle="numai pozitiile din sistemul S1D"
          rows={activePaperPositions1d}
          updatedAt={updatedAt}
          paperPositionLabels={paperPositionLabels}
          emptyText="No active S1D paper positions."
        />

        <BarEvolutionSection
          title="S1D - Bar Evolution"
          subtitle="doar pozitiile din sistemul S1D"
          rows={openPositionEvolutionRows1d}
          emptyText="No open S1D positions to track yet."
        />

        <ActivePositionsSection
          title="S4h - Paper Positions - Active"
          subtitle="numai pozitiile din sistemul S4h"
          rows={activePaperPositions4h}
          updatedAt={updatedAt}
          paperPositionLabels={paperPositionLabels}
          emptyText="No active S4h paper positions."
        />

        <BarEvolutionSection
          title="S4h - Bar Evolution"
          subtitle="doar pozitiile din sistemul S4h"
          rows={openPositionEvolutionRows4h}
          emptyText="No open S4h positions to track yet."
        />

        <ActivePositionsSection
          title="S1h - Paper Positions - Active"
          subtitle="numai pozitiile din sistemul S1h"
          rows={activePaperPositions1h}
          updatedAt={updatedAt}
          paperPositionLabels={paperPositionLabels}
          emptyText="No active S1h paper positions."
        />

        <BarEvolutionSection
          title="S1h - Bar Evolution"
          subtitle="doar pozitiile din sistemul S1h"
          rows={openPositionEvolutionRows1h}
          emptyText="No open S1h positions to track yet."
        />

        

        

        

        

        

        

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
                  <th className="px-4 py-3 text-left">System</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-left">Entry</th>
                  <th className="px-4 py-3 text-left">20 bars</th>
                  <th className="px-4 py-3 text-left">Exit</th>
                  <th className="px-4 py-3 text-left">Partial</th>
                  <th className="px-4 py-3 text-left">Close P/L</th>
                  <th className="px-4 py-3 text-left">P/L $</th>
                  <th className="px-4 py-3 text-left">Money end</th>
                  <th className="px-4 py-3 text-left">Best</th>
                  <th className="px-4 py-3 text-left">Worst</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedPaperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-4 text-slate-400">No closed paper positions yet.</td>
                  </tr>
                ) : (
                  closedPaperPositions.map((row) => {
                    const key = `${row.symbol}-${row.side}-${row.entryAt}`;
                    return (
                      <tr key={key} className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold text-slate-100">{paperPositionLabels.get(key) || row.symbol}</td>
                        <td className="px-4 py-3">{entrySignalBadge(row) || (row.entrySystem || "-")}</td>
                        <td className="px-4 py-3">{shortSide(row.side)}</td>
                        <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                        <td className="px-4 py-3">{barsProgressLabel(row.entryAt, row.entrySystem, row.closedAt || row.lastSeenAt || updatedAt)}</td>
                        <td className="px-4 py-3">{formatExitCell(row.closePrice, row.closePlPercent)}</td>
                        <td className="px-4 py-3">{formatPartialCell(row.partialClosePrice, row.partialClosePlPercent)}</td>
                        <td className={`px-4 py-3 font-semibold ${percentTextClass(row.closePlPercent ?? null)}`}>{formatPercent(row.closePlPercent)}</td>
                        <td className={`px-4 py-3 font-semibold ${percentTextClass(row.closePlPercent ?? null)}`}>{formatUsd(plUsdFromPercent(row.closePlPercent ?? null))}</td>
                        <td className={`px-4 py-3 font-semibold ${percentTextClass(row.closePlPercent ?? null)}`}>{formatUsd(equityUsdFromPercent(row.closePlPercent ?? null))}</td>
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
            <p className="mt-2 text-lg font-semibold text-slate-100">{orderedHistoryPaperPositions.length}</p>
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

        <section className="mb-4 grid gap-2 md:grid-cols-6">
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scan status</p>
            <p className={`mt-2 text-lg font-semibold ${scanSummary.healthy ? "text-emerald-200" : "text-rose-200"}`}>{scanSummary.scanned}/{scanSummary.expected}</p>
            <p className={`mt-1 text-[11px] ${scanSummary.healthy ? "text-emerald-300" : "text-rose-300"}`}>{scanSummary.healthy ? "OK" : "missing scans"}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Visible now</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{scanSummary.visible}</p>
          </div>
          <div className={`${shellClass} p-2.5`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">V0 hidden</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{scanSummary.hiddenV0}</p>
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
