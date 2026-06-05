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
};

type OpenPaperPosition = {
  symbol: string;
  side: string;
  entryPrice: number | null;
  entryAt: string;
  entrySignal?: string;
  entrySystem?: string;
  currentPrice?: number | null;
  status: string;
  lastSeenAt?: string;
};

type PositionSnapshot = {
  scanAt: string;
  currentPrice?: number | null;
  currentPlPercent?: number | null;
  candleClose1h?: number | null;
  candleClose4h?: number | null;
};

type PositionSnapshotBucket = {
  snapshots?: PositionSnapshot[];
};

type DashboardPayload = {
  updatedAt?: string;
  nextScanAt?: string;
  rsiTopRows1h?: InterestRow[];
  openPaperPositions?: OpenPaperPosition[];
  positionSnapshots?: Record<string, PositionSnapshotBucket>;
};

type VersionSummaryRow = {
  key: string;
  symbol: string;
  zone: string;
  rsi: number;
  price: number | null;
  detectedAt: string;
  v0: boolean;
  v1: boolean;
  v2: boolean;
  v3: boolean;
  previousRsi: number | null;
  anchorRsi: number | null;
  anchorTime: string | null;
  anchorPrice: number | null;
  strategySide: string | null;
};

type BarEvolutionRow = {
  key: string;
  symbol: string;
  side: string;
  entryPrice: number | null;
  currentPrice: number | null;
  currentPl: number | null;
  entryAt: string;
  lastSeenAt: string | null;
  scans: PositionSnapshot[];
};

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-3 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

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

function percentTextClass(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-slate-200";
  if (value > 0) return "text-emerald-200";
  if (value < 0) return "text-rose-200";
  return "text-slate-200";
}

function formatCompactDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function zoneLabel(zone: string) {
  if (zone === "lower_interest") return "lower interest";
  if (zone === "upper_interest") return "upper interest";
  return zone;
}

function versionBadge(active: boolean, label: string) {
  if (!active) return null;
  return <span className="inline-flex min-w-[2.25rem] justify-center rounded-full border border-sky-300/70 bg-sky-300/20 px-2 py-1 text-[10px] font-semibold text-sky-50">{label}</span>;
}

function strategySideBadge(side?: string | null) {
  if (!side) return "-";
  const isLong = side.toUpperCase() === "LONG";
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${isLong ? "border-emerald-200/70 bg-emerald-300/20 text-emerald-50" : "border-rose-200/70 bg-rose-300/20 text-rose-50"}`}>{side}</span>;
}

function isRsiTopPosition(row: OpenPaperPosition) {
  const entrySystem = (row.entrySystem || "").toUpperCase();
  const entrySignal = (row.entrySignal || "").toUpperCase();
  return entrySystem.includes("RSI_TOP") || entrySignal.includes("RSI_TOP");
}

function buildVersionSummaryBaseRows(v3Rows: InterestRow[]) {
  const rows = new Map<string, VersionSummaryRow>();

  v3Rows.forEach((row) => {
    const key = `${row.symbol}:${row.zone}`;
    rows.set(key, {
      key,
      symbol: row.symbol,
      zone: row.zone,
      rsi: row.rsi,
      price: row.price,
      detectedAt: row.detectedAt,
      v0: true,
      v1: true,
      v2: true,
      v3: true,
      previousRsi: row.previousRsi ?? null,
      anchorRsi: row.anchorRsi ?? null,
      anchorTime: row.anchorTime ?? null,
      anchorPrice: row.anchorPrice ?? null,
      strategySide: row.strategySide ?? null,
    });
  });

  return [...rows.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function computePlValue(entryPrice?: number | null, currentPrice?: number | null, side?: string | null) {
  if (entryPrice == null || currentPrice == null || !Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || !side) return null;
  if (entryPrice === 0) return null;
  return side.toUpperCase() === "SHORT"
    ? ((entryPrice - currentPrice) / entryPrice) * 100
    : ((currentPrice - entryPrice) / entryPrice) * 100;
}

function MatrixSection({ rows }: { rows: VersionSummaryRow[] }) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">S1h - RSI Top Version Matrix</h2>
        <span className="text-[10px] text-slate-400">doar strategia RSI Top</span>
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
                <td colSpan={11} className="px-4 py-4 text-slate-400">No coins in tracked S1h RSI Top versions right now.</td>
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
                  <td className="px-4 py-3">{versionBadge(row.v3, "V3")}</td>
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

function BarEvolutionSection({ rows }: { rows: BarEvolutionRow[] }) {
  return (
    <section className={`${shellClass} mb-4`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">S1h - RSI Top Bar Evolution</h2>
        <span className="text-[10px] text-slate-400">doar pozițiile RSI Top</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/25">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Coin</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-left">Entry</th>
              <th className="px-4 py-3 text-left">Current</th>
              <th className="px-4 py-3 text-left">P/L</th>
              <th className="px-4 py-3 text-left">Opened</th>
              <th className="px-4 py-3 text-left">Last seen</th>
              <th className="px-4 py-3 text-left">Scans</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-slate-400">No open RSI Top positions to track yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-white/10">
                  <td className="px-4 py-3 font-semibold text-slate-100">{row.symbol}</td>
                  <td className="px-4 py-3">{strategySideBadge(row.side)}</td>
                  <td className="px-4 py-3">{formatPrice(row.entryPrice)}</td>
                  <td className="px-4 py-3">{formatPrice(row.currentPrice)}</td>
                  <td className={`px-4 py-3 font-semibold ${percentTextClass(row.currentPl)}`}>{formatPercent(row.currentPl)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.entryAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCompactDate(row.lastSeenAt)}</td>
                  <td className="px-4 py-3">{row.scans.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CryptoDashboardPage() {
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [openPaperPositions, setOpenPaperPositions] = useState<OpenPaperPosition[]>([]);
  const [positionSnapshots, setPositionSnapshots] = useState<Record<string, PositionSnapshotBucket>>({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [nextScanAt, setNextScanAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/data/rsi-trend-dashboard.json?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: DashboardPayload = await response.json();
        if (cancelled) return;
        setRows(Array.isArray(data.rsiTopRows1h) ? data.rsiTopRows1h : []);
        setOpenPaperPositions(Array.isArray(data.openPaperPositions) ? data.openPaperPositions : []);
        setPositionSnapshots(data.positionSnapshots && typeof data.positionSnapshots === "object" ? data.positionSnapshots : {});
        setUpdatedAt(data.updatedAt || "");
        setNextScanAt(data.nextScanAt || "");
        setError("");
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

  const versionRows = useMemo(() => buildVersionSummaryBaseRows(rows), [rows]);

  const barEvolutionRows = useMemo(() => {
    return openPaperPositions
      .filter((row) => isRsiTopPosition(row) && row.entrySystem === "S1h" && !(row.status || "").startsWith("closed"))
      .map((row) => {
        const key = `${row.symbol}:${row.side}:${row.entryAt}`;
        const bucket = positionSnapshots[key];
        return {
          key,
          symbol: row.symbol,
          side: row.side,
          entryPrice: row.entryPrice ?? null,
          currentPrice: row.currentPrice ?? null,
          currentPl: computePlValue(row.entryPrice, row.currentPrice, row.side),
          entryAt: row.entryAt,
          lastSeenAt: row.lastSeenAt || null,
          scans: Array.isArray(bucket?.snapshots) ? bucket!.snapshots! : [],
        } satisfies BarEvolutionRow;
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [openPaperPositions, positionSnapshots]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_35%),linear-gradient(180deg,_#101826_0%,_#1a2433_100%)] px-3 py-4 md:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">RSI Top Dashboard</h1>
            <p className="text-sm text-slate-300">doar strategia RSI Top, focus pe S1h</p>
          </div>
          <div className="text-xs leading-5 text-slate-200">
            <p>Feed updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
            <p>Next scan: {nextScanAt ? new Date(nextScanAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        {error ? <div className={`${shellClass} mb-4 text-sm text-rose-200`}>Dashboard load error: {error}</div> : null}
        {loading ? <div className={`${shellClass} mb-4 text-sm text-slate-300`}>Loading RSI Top dashboard…</div> : null}

        <MatrixSection rows={versionRows} />
        <BarEvolutionSection rows={barEvolutionRows} />
      </div>
    </main>
  );
}
