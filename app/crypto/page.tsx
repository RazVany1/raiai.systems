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
  anchorPrice?: number | null;
  previousRsi?: number | null;
  strategySide?: string | null;
  firstDetectedAt?: string;
  lastSeenAt?: string;
  currentlyInZone?: boolean;
};

type OpenPaperPosition = {
  symbol: string;
  side: string;
  entryPrice: number | null;
  entryAt: string;
  entryState?: string;
  entrySignal?: string;
  entrySystem?: string;
  signalZone?: string;
  trendDirection?: string | null;
  tradePermission?: string | null;
  invalidationLevel?: number | null;
  formationType?: string;
  detectedAt?: string;
  lastSeenAt?: string;
  currentPrice?: number | null;
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

type DashboardPayload = {
  updatedAt?: string;
  nextScanAt?: string;
  scanUniverseExpected?: number;
  scanUniverseSymbols?: string[];
  openPaperPositions?: OpenPaperPosition[];
  paperPositionHistory?: OpenPaperPosition[];
  positionSnapshots?: Record<string, PositionSnapshotBucket>;
  rsiTopRows1h?: InterestRow[];
  rsiTopV0Rows1h?: InterestRow[];
  rsiTopV1Rows1h?: InterestRow[];
  rsiTopV2Rows1h?: InterestRow[];
  rsiTopV3Rows1h?: InterestRow[];
};

type VersionSummaryRow = {
  key: string;
  symbol: string;
  zone: string;
  rsi: number;
  price: number | null;
  detectedAt: string;
  lastSeenAt: string | null;
  v0: boolean;
  v1: boolean;
  v2: boolean;
  v3: boolean;
  v0Active: boolean;
  v1Active: boolean;
  v2Active: boolean;
  v3Active: boolean;
  previousRsi: number | null;
  anchorRsi: number | null;
  anchorTime: string | null;
  anchorPrice: number | null;
  strategySide: string | null;
};

type EvolutionRow = {
  key: string;
  row: OpenPaperPosition;
  progress: string;
  trackedBars: number;
  maxScans: number;
  slotsPerBar: number;
  scanSeries: { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null }[];
  minPrice: number | null;
  maxPrice: number | null;
  bestPoint: { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null } | null;
  worstPoint: { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null } | null;
  currentPoint: { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null } | null;
};

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";
const SCAN_INTERVAL_MINUTES = 30;

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  if (abs >= 10) return value.toFixed(2);
  return value.toFixed(4);
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
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

function zoneLabel(zone: string) {
  if (zone === "lower_interest") return "lower interest";
  if (zone === "upper_interest") return "upper interest";
  return zone;
}

function computePlValue(entryPrice?: number | null, currentPrice?: number | null, side?: string | null) {
  if (entryPrice == null || currentPrice == null || !Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || !side || entryPrice === 0) return null;
  return side.toUpperCase() === "SHORT"
    ? ((entryPrice - currentPrice) / entryPrice) * 100
    : ((currentPrice - entryPrice) / entryPrice) * 100;
}

function percentTextClass(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-slate-300";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function strategySideBadge(side?: string | null) {
  if (!side) return <span className="text-slate-400">-</span>;
  const isLong = side.toUpperCase() === "LONG";
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${isLong ? "border-emerald-200/70 bg-emerald-300/20 text-emerald-50" : "border-rose-200/70 bg-rose-300/20 text-rose-50"}`}>{side}</span>;
}

function versionBadge(active: boolean, label: string) {
  if (!active) return <span className="text-slate-500">-</span>;
  return <span className="inline-flex min-w-[2.25rem] justify-center rounded-full border border-sky-300/70 bg-sky-300/20 px-2 py-1 text-[10px] font-semibold text-sky-50">{label}</span>;
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
    closed_hard_stop: "HSL",
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

function barsProgressLabel(entryAt?: string | null, system?: string | null, updatedAt?: string | null) {
  const barHours = systemBarHours(system);
  const entryDate = parseIsoDate(entryAt);
  const updatedDate = parseIsoDate(updatedAt);
  if (!barHours || !entryDate || !updatedDate) return "-";
  const elapsedMs = Math.max(0, updatedDate.getTime() - entryDate.getTime());
  const bars = Math.floor(elapsedMs / (barHours * 60 * 60 * 1000)) + 1;
  const trackedBars = systemTrackedBars(system);
  return `${Math.min(bars, trackedBars)}/${trackedBars}`;
}

function snapshotDisplayPrice(snapshot?: PositionSnapshot | null) {
  if (!snapshot) return null;
  if (typeof snapshot.currentPrice === "number" && Number.isFinite(snapshot.currentPrice)) return snapshot.currentPrice;
  if (typeof snapshot.candleClose1h === "number" && Number.isFinite(snapshot.candleClose1h)) return snapshot.candleClose1h;
  if (typeof snapshot.candleClose4h === "number" && Number.isFinite(snapshot.candleClose4h)) return snapshot.candleClose4h;
  return null;
}

function isRsiTopPosition(row: OpenPaperPosition) {
  const entrySignal = (row.entrySignal || "").toUpperCase();
  return entrySignal.includes("RSI_TOP");
}

function buildVersionSummaryBaseRows(v0Rows: InterestRow[], v1Rows: InterestRow[], v2Rows: InterestRow[], v3Rows: InterestRow[]) {
  const rows = new Map<string, VersionSummaryRow>();

  const upsert = (row: InterestRow, version: "v0" | "v1" | "v2" | "v3") => {
    const key = `${row.symbol}:${row.zone}`;
    const existing = rows.get(key);
    const next: VersionSummaryRow = existing || {
      key,
      symbol: row.symbol,
      zone: row.zone,
      rsi: row.rsi,
      price: row.price,
      detectedAt: row.detectedAt,
      lastSeenAt: row.lastSeenAt ?? null,
      v0: false,
      v1: false,
      v2: false,
      v3: false,
      v0Active: false,
      v1Active: false,
      v2Active: false,
      v3Active: false,
      previousRsi: row.previousRsi ?? null,
      anchorRsi: row.anchorRsi ?? null,
      anchorTime: row.anchorTime ?? null,
      anchorPrice: row.anchorPrice ?? null,
      strategySide: row.strategySide ?? null,
    };

    next[version] = true;
    next[`${version}Active`] = Boolean(row.currentlyInZone);
    const incomingSeen = parseIsoDate(row.lastSeenAt ?? row.detectedAt ?? row.firstDetectedAt);
    const existingSeen = parseIsoDate(next.lastSeenAt ?? next.detectedAt);
    if (!existingSeen || (incomingSeen && incomingSeen >= existingSeen)) {
      next.rsi = row.rsi;
      next.price = row.price;
      next.detectedAt = row.detectedAt;
      next.lastSeenAt = row.lastSeenAt ?? null;
      next.previousRsi = row.previousRsi ?? next.previousRsi;
      next.anchorRsi = row.anchorRsi ?? next.anchorRsi;
      next.anchorTime = row.anchorTime ?? next.anchorTime;
      next.anchorPrice = row.anchorPrice ?? next.anchorPrice;
      next.strategySide = row.strategySide ?? next.strategySide;
    }

    rows.set(key, next);
  };

  v0Rows.forEach((row) => upsert(row, "v0"));
  v1Rows.forEach((row) => upsert(row, "v1"));
  v2Rows.forEach((row) => upsert(row, "v2"));
  v3Rows.forEach((row) => upsert(row, "v3"));

  return [...rows.values()]
    .filter((row) => row.v1Active || row.v2Active || row.v3Active)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function MetricCard({ label, value, tone = "text-slate-100" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`${shellClass} p-2.5`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MatrixSection({ rows }: { rows: VersionSummaryRow[] }) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">S1h — RSI Top Version Matrix</h2>
        <span className="text-[10px] text-slate-400">V0 / V1 / V2 / V3 pe aceeași monedă</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Coin</th>
              <th className="px-4 py-3 text-left">Side</th>
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
                <td colSpan={14} className="px-4 py-4 text-slate-400">No coins in tracked S1h RSI Top versions right now.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-white/10">
                  <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                  <td className="px-4 py-3">{strategySideBadge(row.strategySide)}</td>
                  <td className="px-4 py-3">{row.rsi.toFixed(2)}</td>
                  <td className="px-4 py-3">{formatPrice(row.price)}</td>
                  <td className="px-4 py-3">{zoneLabel(row.zone)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.detectedAt)}</td>
                  <td className="px-4 py-3">{versionBadge(row.v0Active, "V0")}</td>
                  <td className="px-4 py-3">{versionBadge(row.v1Active, "V1")}</td>
                  <td className="px-4 py-3">{versionBadge(row.v2Active, "V2")}</td>
                  <td className="px-4 py-3">{versionBadge(row.v3Active, "V3")}</td>
                  <td className="px-4 py-3 font-semibold text-slate-100">{row.anchorRsi != null ? row.anchorRsi.toFixed(2) : "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-100">{formatPrice(row.anchorPrice)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.anchorTime)}</td>
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

function PositionsSection({ title, rows, updatedAt, showClosed = false }: { title: string; rows: OpenPaperPosition[]; updatedAt: string; showClosed?: boolean }) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-[10px] text-slate-400">doar RSI Top</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Coin</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-left">System</th>
              <th className="px-4 py-3 text-left">Entry</th>
              <th className="px-4 py-3 text-left">Bars</th>
              <th className="px-4 py-3 text-left">Current</th>
              <th className="px-4 py-3 text-left">Current P/L</th>
              <th className="px-4 py-3 text-left">Best</th>
              <th className="px-4 py-3 text-left">Worst</th>
              {showClosed ? <th className="px-4 py-3 text-left">Exit</th> : <th className="px-4 py-3 text-left">Runner stop</th>}
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Last / Closed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-4 text-slate-400">No {showClosed ? "closed" : "active"} RSI Top paper positions.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const currentPl = computePlValue(row.entryPrice, row.currentPrice, row.side);
                return (
                  <tr key={`${row.symbol}:${row.side}:${row.entryAt}`} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                    <td className="px-4 py-3">{strategySideBadge(row.side)}</td>
                    <td className="px-4 py-3">{row.entrySystem || "-"}</td>
                    <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                    <td className="px-4 py-3">{barsProgressLabel(row.entryAt, row.entrySystem, row.closedAt || row.lastSeenAt || updatedAt)}</td>
                    <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                    <td className={`px-4 py-3 font-semibold ${percentTextClass(currentPl)}`}>{formatPercent(currentPl)}</td>
                    <td className={`px-4 py-3 ${percentTextClass(row.maxPlPercent)}`}>{formatPercent(row.maxPlPercent)}</td>
                    <td className={`px-4 py-3 ${percentTextClass(row.minPlPercent)}`}>{formatPercent(row.minPlPercent)}</td>
                    {showClosed ? (
                      <td className="px-4 py-3">{formatPartialCell(row.closePrice, row.closePlPercent)}</td>
                    ) : (
                      <td className="px-4 py-3">{formatPrice(row.runnerStopPrice)}</td>
                    )}
                    <td className="px-4 py-3">{shortStatus(row.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(showClosed ? row.closedAt : row.lastSeenAt)}</td>
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

function EvolutionSection({ rows }: { rows: EvolutionRow[] }) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">S1h — RSI Top Bar Evolution</h2>
        <span className="text-[10px] text-slate-400">toate scan-urile 30m pe 40 bars</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-950/25 px-4 py-4 text-sm text-slate-400">No open RSI Top positions to track yet.</div>
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
            const linePoints = scanSeries.map((point) => `${scanToX(point.scanIndex)},${valueToY(point.price)}`).join(" ");
            const entryY = row.entryPrice != null && minPrice != null && maxPrice != null ? valueToY(row.entryPrice) : null;
            const barMarkers = Array.from({ length: trackedBars }, (_, index) => {
              const scanIndex = index * Math.max(slotsPerBar, 1) + 1;
              return { bar: index + 1, x: scanToX(scanIndex) };
            });

            return (
              <div key={`evolution-${key}`} className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="font-semibold text-white">{row.symbol}</span>
                  <span>{strategySideBadge(row.side)}</span>
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
                    {entryY != null ? <line x1={paddingX} y1={entryY} x2={paddingX + plotWidth} y2={entryY} stroke="rgba(250,204,21,0.8)" strokeDasharray="6 4" /> : null}
                    {barMarkers.map((marker) => (
                      <g key={`${key}-marker-${marker.bar}`}>
                        <line x1={marker.x} y1={paddingTop} x2={marker.x} y2={paddingTop + plotHeight} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 5" />
                        <text x={marker.x + 2} y={height - 8} fill="rgba(148,163,184,0.8)" fontSize="10">B{marker.bar}</text>
                      </g>
                    ))}
                    {linePoints ? <polyline fill="none" stroke="rgba(125,211,252,0.95)" strokeWidth="2.5" points={linePoints} /> : null}
                    {scanSeries.map((point) => (
                      <circle key={`${key}-scan-${point.scanIndex}`} cx={scanToX(point.scanIndex)} cy={valueToY(point.price)} r="2.5" fill={point.pl != null && point.pl >= 0 ? "rgba(52,211,153,0.9)" : "rgba(251,113,133,0.9)"} />
                    ))}
                    {bestPoint ? <circle cx={scanToX(bestPoint.scanIndex)} cy={valueToY(bestPoint.price)} r="5" fill="rgba(16,185,129,1)" stroke="white" strokeWidth="1.5" /> : null}
                    {worstPoint ? <circle cx={scanToX(worstPoint.scanIndex)} cy={valueToY(worstPoint.price)} r="5" fill="rgba(244,63,94,1)" stroke="white" strokeWidth="1.5" /> : null}
                    {currentPoint ? <circle cx={scanToX(currentPoint.scanIndex)} cy={valueToY(currentPoint.price)} r="4.5" fill="rgba(255,255,255,0.95)" stroke="rgba(59,130,246,0.9)" strokeWidth="1.5" /> : null}
                  </svg>
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
  const [payload, setPayload] = useState<DashboardPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/data/rsi-trend-dashboard.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: DashboardPayload = await response.json();
        if (!cancelled) {
          setPayload(data || {});
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const updatedAt = payload.updatedAt || "";
  const nextScanAt = payload.nextScanAt || "";
  const expected = Number.isFinite(payload.scanUniverseExpected) ? payload.scanUniverseExpected || 0 : 0;
  const rsiTopV0Rows1h = Array.isArray(payload.rsiTopV0Rows1h) ? payload.rsiTopV0Rows1h : [];
  const rsiTopV1Rows1h = Array.isArray(payload.rsiTopV1Rows1h) ? payload.rsiTopV1Rows1h : [];
  const rsiTopV2Rows1h = Array.isArray(payload.rsiTopV2Rows1h) ? payload.rsiTopV2Rows1h : [];
  const rsiTopV3Rows1h = Array.isArray(payload.rsiTopV3Rows1h) ? payload.rsiTopV3Rows1h : (Array.isArray(payload.rsiTopRows1h) ? payload.rsiTopRows1h : []);
  const openPaperPositions = Array.isArray(payload.openPaperPositions) ? payload.openPaperPositions : [];
  const paperPositionHistory = Array.isArray(payload.paperPositionHistory) ? payload.paperPositionHistory : [];
  const positionSnapshots = payload.positionSnapshots && typeof payload.positionSnapshots === "object" ? payload.positionSnapshots : {};

  const activeV0Count = rsiTopV0Rows1h.filter((row) => row.currentlyInZone).length;
  const activeV1Count = rsiTopV1Rows1h.filter((row) => row.currentlyInZone).length;
  const activeV2Count = rsiTopV2Rows1h.filter((row) => row.currentlyInZone).length;
  const activeV3Count = rsiTopV3Rows1h.filter((row) => row.currentlyInZone).length;

  const matrixRows = useMemo(() => buildVersionSummaryBaseRows(rsiTopV0Rows1h, rsiTopV1Rows1h, rsiTopV2Rows1h, rsiTopV3Rows1h), [rsiTopV0Rows1h, rsiTopV1Rows1h, rsiTopV2Rows1h, rsiTopV3Rows1h]);

  const activePositions = useMemo(() => {
    return openPaperPositions
      .filter((row) => isRsiTopPosition(row) && row.entrySystem === "S1h" && !(row.status || "").startsWith("closed"))
      .sort((a, b) => (parseIsoDate(b.entryAt)?.getTime() || 0) - (parseIsoDate(a.entryAt)?.getTime() || 0));
  }, [openPaperPositions]);

  const closedPositions = useMemo(() => {
    return paperPositionHistory
      .filter((row) => isRsiTopPosition(row) && row.entrySystem === "S1h")
      .sort((a, b) => (parseIsoDate(b.closedAt || b.lastSeenAt)?.getTime() || 0) - (parseIsoDate(a.closedAt || a.lastSeenAt)?.getTime() || 0));
  }, [paperPositionHistory]);

  const evolutionRows = useMemo(() => {
    return activePositions.map((row) => {
      const key = `${row.symbol}:${row.side}:${row.entryAt}`;
      const bucket = positionSnapshots[key];
      const slotsPerBar = systemScanSlots(row.entrySystem) || 0;
      const trackedBars = systemTrackedBars(row.entrySystem);
      const maxScans = slotsPerBar * trackedBars;
      const entryDate = parseIsoDate(row.entryAt);
      const snapshots = (Array.isArray(bucket?.snapshots) ? bucket.snapshots : [])
        .filter((snapshot) => snapshotDisplayPrice(snapshot) != null)
        .sort((a, b) => (parseIsoDate(a.scanAt)?.getTime() || 0) - (parseIsoDate(b.scanAt)?.getTime() || 0));

      const scanSeries = snapshots
        .map((snapshot) => {
          const scanDate = parseIsoDate(snapshot.scanAt);
          const price = snapshotDisplayPrice(snapshot);
          if (!entryDate || !scanDate || price == null) return null;
          const elapsedMinutes = Math.max(0, (scanDate.getTime() - entryDate.getTime()) / (60 * 1000));
          const scanIndex = Math.floor(elapsedMinutes / SCAN_INTERVAL_MINUTES) + 1;
          if (scanIndex < 1 || scanIndex > maxScans) return null;
          const bar = Math.floor((scanIndex - 1) / Math.max(slotsPerBar, 1)) + 1;
          return { scanAt: snapshot.scanAt, scanIndex, bar, price, pl: computePlValue(row.entryPrice, price, row.side) };
        })
        .filter((item): item is { scanAt: string; scanIndex: number; bar: number; price: number; pl: number | null } => Boolean(item));

      const priceValues = [
        ...(row.entryPrice != null && Number.isFinite(row.entryPrice) ? [row.entryPrice] : []),
        ...scanSeries.map((point) => point.price),
      ];
      const minPrice = priceValues.length ? Math.min(...priceValues) : null;
      const maxPrice = priceValues.length ? Math.max(...priceValues) : null;
      const bestPoint = scanSeries.reduce<EvolutionRow["bestPoint"]>((best, point) => (point.pl != null && (!best || (best.pl ?? -Infinity) < point.pl) ? point : best), null);
      const worstPoint = scanSeries.reduce<EvolutionRow["worstPoint"]>((worst, point) => (point.pl != null && (!worst || (worst.pl ?? Infinity) > point.pl) ? point : worst), null);
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
      } satisfies EvolutionRow;
    });
  }, [activePositions, positionSnapshots, updatedAt]);

  const visibleCoins = new Set(matrixRows.map((row) => row.symbol)).size;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-3 py-4 md:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">RSI Top Dashboard</h1>
            <p className="text-sm text-slate-300">layout ca strategia inițială RSI, dar doar pentru RSI Top pe S1h</p>
          </div>
          <div className="text-xs leading-5 text-slate-200">
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
            <p>Next scan: {nextScanAt ? new Date(nextScanAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        {error ? <div className={`${shellClass} mb-4 text-sm text-rose-200`}>Dashboard load error: {error}</div> : null}
        {loading ? <div className={`${shellClass} mb-4 text-sm text-slate-300`}>Loading RSI Top dashboard…</div> : null}

        <section className="mb-4 grid gap-2 md:grid-cols-6">
          <MetricCard label="Scan status" value={`${visibleCoins}/${expected || visibleCoins}`} tone={expected && visibleCoins < expected ? "text-amber-200" : "text-emerald-200"} />
          <MetricCard label="Visible now" value={visibleCoins} />
          <MetricCard label="V0 active" value={activeV0Count} />
          <MetricCard label="V1 active" value={activeV1Count} />
          <MetricCard label="V2 active" value={activeV2Count} />
          <MetricCard label="V3 active" value={activeV3Count} />
        </section>

        <MatrixSection rows={matrixRows} />
        <PositionsSection title="Paper Positions — Active" rows={activePositions} updatedAt={updatedAt} />
        <EvolutionSection rows={evolutionRows} />
        <PositionsSection title="Paper Positions — Closed" rows={closedPositions} updatedAt={updatedAt} showClosed />
      </div>
    </main>
  );
}
