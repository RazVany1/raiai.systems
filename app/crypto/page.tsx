import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Candidate = {
  symbol?: string;
  side?: string;
  score?: number;
  grade?: string;
  entryZone?: number[];
  stop?: number;
  riskReward?: number;
  metrics?: {
    price?: number;
    ema20_1h?: number;
    ema20_4h?: number;
    ema50_4h?: number;
    rsi_1h?: number;
    rsi_4h?: number;
  };
  reasons?: string[];
  warnings?: string[];
  price?: number;
  fundingRate?: number;
  openInterest?: number;
  drop72hPct?: number;
  reboundFromLowPct?: number;
  rsi1h?: number;
  ema20_1h?: number;
  tp1Price?: number;
  runnerTargetPrice?: number;
};

type PaperPosition = {
  id?: string;
  symbol?: string;
  side?: string;
  status?: string;
  entryPrice?: number;
  stop?: number;
  lastPrice?: number;
  currentR?: number;
  maxR?: number;
  grade?: string;
  setupScore?: number;
  openedAt?: string;
  lastCheckedAt?: string;
  closedAt?: string;
  exitPrice?: number;
  rMultiple?: number;
  originalStop?: number;
  initialRisk?: number;
  tp1Price?: number;
  runnerTargetPrice?: number;
  runnerStopReason?: string;
  activeStopReason?: string;
  exitReason?: string;
  actionLog?: Array<{ at?: string; action?: string; price?: number; stop?: number; entryPrice?: number; partialPrice?: number; exitPrice?: number; rMultiple?: number }>;
};

type PullbackSnapshot = {
  system?: string;
  version?: string;
  updatedAt?: string;
  marketRegime?: {
    label?: string;
    btcTrend?: string;
    ethTrend?: string;
    universeHealthPct?: number;
    notes?: string[];
  };
  scanStats?: Record<string, number>;
  candidates?: Candidate[];
  paperPositions?: PaperPosition[];
  closedPaperPositions?: PaperPosition[];
  errors?: Array<{ symbol?: string; error?: string }>;
};

const dataPath = path.join(process.cwd(), "public", "data", "pullback-continuation-snapshot.json");
const fundingDataPath = path.join(process.cwd(), "public", "data", "funding-reset-reclaim-snapshot.json");

function loadJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadSnapshot(): PullbackSnapshot | null {
  return loadJson<PullbackSnapshot>(dataPath);
}

function fmt(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "number") {
    if (Math.abs(value) < 1) return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(value);
}

function dateFmt(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ro-RO", { timeZone: "America/Los_Angeles" });
  } catch {
    return value;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function progressFromR(rValue?: number): number {
  // Scale visual: -1R stop = 0%, entry 0R = 33%, +2R target = 100%.
  return clamp((((Number(rValue ?? 0) + 1) / 3) * 100), 0, 100);
}

function targetPrice(position: PaperPosition): number | null {
  const configuredTarget = Number(position.runnerTargetPrice);
  if (Number.isFinite(configuredTarget)) return configuredTarget;
  const entry = Number(position.entryPrice);
  const risk = Number(position.initialRisk);
  if (Number.isFinite(entry) && Number.isFinite(risk) && risk > 0) {
    return position.side === "SHORT" ? entry - risk * 2.5 : entry + risk * 2.5;
  }
  const stop = Number(position.originalStop ?? position.stop);
  if (!Number.isFinite(entry) || !Number.isFinite(stop)) return null;
  const fallbackRisk = Math.abs(entry - stop);
  if (!fallbackRisk) return null;
  return position.side === "SHORT" ? entry - fallbackRisk * 2.5 : entry + fallbackRisk * 2.5;
}

const SIM_MARGIN_USD = 50;
const SIM_LEVERAGE = 3;
const SIM_NOTIONAL_USD = SIM_MARGIN_USD * SIM_LEVERAGE;

function simulatedPnl(position: PaperPosition): number | null {
  const entry = Number(position.entryPrice);
  const mark = Number(position.exitPrice ?? position.lastPrice);
  if (!Number.isFinite(entry) || !Number.isFinite(mark) || entry <= 0) return null;
  const direction = position.side === "SHORT" ? -1 : 1;
  return ((mark - entry) / entry) * direction * SIM_NOTIONAL_USD;
}

function simulatedRoiOnMargin(position: PaperPosition): number | null {
  const pnl = simulatedPnl(position);
  if (!Number.isFinite(Number(pnl))) return null;
  return (Number(pnl) / SIM_MARGIN_USD) * 100;
}

function stopHit(position: PaperPosition): boolean {
  const stop = Number(position.stop);
  const mark = Number(position.exitPrice ?? position.lastPrice);
  if (!Number.isFinite(stop) || !Number.isFinite(mark)) return false;
  return position.side === "SHORT" ? mark >= stop : mark <= stop;
}

function distanceToStopPct(position: PaperPosition): number | null {
  const stop = Number(position.stop);
  const mark = Number(position.exitPrice ?? position.lastPrice);
  if (!Number.isFinite(stop) || !Number.isFinite(mark) || mark <= 0) return null;
  const raw = position.side === "SHORT" ? (stop - mark) / mark : (mark - stop) / mark;
  return raw * 100;
}

function pnlAtStop(position: PaperPosition): number | null {
  const entry = Number(position.entryPrice);
  const stop = Number(position.stop);
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= 0) return null;
  const direction = position.side === "SHORT" ? -1 : 1;
  return ((stop - entry) / entry) * direction * SIM_NOTIONAL_USD;
}

function isClosedPosition(position: PaperPosition): boolean {
  const status = String(position.status ?? "").toLowerCase();
  return status.startsWith("closed") || Boolean(position.closedAt || position.exitPrice !== undefined);
}

function statusLabel(position: PaperPosition): string {
  if (isClosedPosition(position)) return "ÎNCHISĂ";
  if (String(position.status ?? "").includes("partial")) return "DESCHISĂ — runner";
  return "DESCHISĂ";
}

function statusTone(position: PaperPosition): string {
  if (!isClosedPosition(position)) return "#22c55e";
  return Number(position.rMultiple ?? simulatedPnl(position) ?? 0) >= 0 ? "#38bdf8" : "#f97316";
}

function readableStatus(position: PaperPosition): string {
  const raw = String(position.status ?? "—");
  const map: Record<string, string> = {
    open_paper_candidate: "deschisă — paper",
    partial_taken_runner: "deschisă — TP1 luat, runner activ",
    closed_risk_off_defensive: "închisă — risk-off defensiv",
    closed_runner_target: "închisă — runner target",
    closed_runner_breakeven: "închisă — runner BE",
    closed_stop: "închisă — stop loss",
  };
  return map[raw] ?? raw.replaceAll("_", " ");
}

const panel: React.CSSProperties = {
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 18,
  background: "#020617",
  boxShadow: "0 18px 60px rgba(0,0,0,.35)",
};

const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 };
const valueStyle: React.CSSProperties = { color: "#e5e7eb", fontSize: 24, fontWeight: 700, marginTop: 6 };

function StatCard({ label, value, tone }: { label: string; value: unknown; tone?: string }) {
  return (
    <div style={panel}>
      <div style={labelStyle}>{label}</div>
      <div style={{ ...valueStyle, color: tone ?? "#e5e7eb" }}>{fmt(value)}</div>
    </div>
  );
}

function Badge({ children, tone = "#38bdf8" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span style={{ border: `1px solid ${tone}`, color: tone, padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

type StrategySummary = {
  name: string;
  candidates: number;
  aSetups: number;
  bSetups: number;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
  openPnl: number;
  closedPnl: number;
};

function StrategyComparisonPanel({ pullback, funding }: { pullback: StrategySummary; funding: StrategySummary }) {
  const rows = [pullback, funding].map((s) => {
    const closedPnl = s.closedPnl;
    const totalPnl = s.openPnl + s.closedPnl;
    const wins = s.closedPositions.filter((p) => Number(p.rMultiple ?? simulatedPnl(p) ?? 0) > 0).length;
    const losses = s.closedPositions.filter((p) => Number(p.rMultiple ?? simulatedPnl(p) ?? 0) <= 0).length;
    return { ...s, totalPnl, wins, losses, openRisk: s.openPositions.length * SIM_MARGIN_USD };
  });
  const leader = rows.reduce((best, row) => row.totalPnl > best.totalPnl ? row : best, rows[0]);
  return (
    <section style={{ ...panel, marginBottom: 22, borderColor: "#2563eb" }}>
      <h2 style={{ marginTop: 0 }}>Strategy Comparison Panel</h2>
      <p style={{ color: "#94a3b8", marginTop: -4 }}>Comparație paper: Pullback Continuation vs Funding Reset Reclaim. Simulare $50 margin / 3x per poziție.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.name} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, padding: 12, border: "1px solid #334155", borderRadius: 14, background: row.name === leader.name ? "rgba(34,197,94,.08)" : "#0f172a" }}>
            <strong style={{ fontSize: 18 }}>{row.name}</strong>
            <span>Candidates: <b>{fmt(row.candidates)}</b></span>
            <span>A/B: <b>{fmt(row.aSetups)}/{fmt(row.bSetups)}</b></span>
            <span>Open: <b style={{ color: "#22c55e" }}>{row.openPositions.length}</b></span>
            <span>Closed: <b>{row.closedPositions.length}</b></span>
            <span>Win/Loss: <b>{row.wins}/{row.losses}</b></span>
            <span>Open risk: <b>${row.openRisk.toFixed(0)}</b></span>
            <span>Open P/L: <b style={{ color: row.openPnl >= 0 ? "#22c55e" : "#ef4444" }}>${row.openPnl.toFixed(2)}</b></span>
            <span>Closed P/L: <b style={{ color: row.closedPnl >= 0 ? "#22c55e" : "#ef4444" }}>${row.closedPnl.toFixed(2)}</b></span>
            <span>Total P/L: <b style={{ color: row.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>${row.totalPnl.toFixed(2)}</b></span>
            {row.name === leader.name ? <Badge tone="#22c55e">leader acum</Badge> : <span />}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CryptoPage() {
  const snapshot = loadSnapshot();
  const fundingSnapshot = loadJson<PullbackSnapshot>(fundingDataPath);

  if (!snapshot) {
    return (
      <main style={{ minHeight: "100vh", padding: 24, background: "#020617", color: "#e5e7eb" }}>
        <h1>RAI Crypto — Pullback Continuation</h1>
        <p style={{ color: "#fca5a5" }}>Nu găsesc snapshotul: {dataPath}</p>
      </main>
    );
  }

  const stats = snapshot.scanStats ?? {};
  const regime = snapshot.marketRegime ?? {};
  const candidates = snapshot.candidates ?? [];
  const openPositions = snapshot.paperPositions ?? [];
  const closedPositions = snapshot.closedPaperPositions ?? [];
  const simulatedPositions = [...openPositions, ...closedPositions];
  const openPnl = openPositions.reduce((sum, p) => sum + Number(simulatedPnl(p) ?? 0), 0);
  const closedPnl = closedPositions.reduce((sum, p) => sum + Number(simulatedPnl(p) ?? 0), 0);
  const totalPnl = openPnl + closedPnl;
  const openMargin = openPositions.length * SIM_MARGIN_USD;
  const openNotional = openPositions.length * SIM_NOTIONAL_USD;
  const wins = closedPositions.filter((p) => Number(p.rMultiple ?? 0) > 0).length;
  const losses = closedPositions.filter((p) => Number(p.rMultiple ?? 0) <= 0).length;
  let curve = 0;
  const equityPoints = closedPositions.map((p) => {
    curve += Number(simulatedPnl(p) ?? 0);
    return curve;
  });
  const bestTrade = simulatedPositions.reduce<PaperPosition | null>((best, p) => simulatedPnl(p) !== null && (!best || Number(simulatedPnl(p)) > Number(simulatedPnl(best))) ? p : best, null);
  const worstTrade = simulatedPositions.reduce<PaperPosition | null>((worst, p) => simulatedPnl(p) !== null && (!worst || Number(simulatedPnl(p)) < Number(simulatedPnl(worst))) ? p : worst, null);
  const fundingStats = fundingSnapshot?.scanStats ?? {};
  const fundingRegime = fundingSnapshot?.marketRegime ?? {};
  const fundingCandidates = fundingSnapshot?.candidates ?? [];
  const fundingOpen = fundingSnapshot?.paperPositions ?? [];
  const fundingClosed = fundingSnapshot?.closedPaperPositions ?? [];
  const fundingOpenPnl = fundingOpen.reduce((sum, p) => sum + Number(simulatedPnl(p) ?? 0), 0);
  const fundingClosedPnl = fundingClosed.reduce((sum, p) => sum + Number(simulatedPnl(p) ?? 0), 0);
  const pullbackSummary: StrategySummary = {
    name: "Pullback",
    candidates: Number(stats.candidates ?? candidates.length),
    aSetups: Number(stats.aSetups ?? 0),
    bSetups: Number(stats.bSetups ?? 0),
    openPositions,
    closedPositions,
    openPnl,
    closedPnl,
  };
  const fundingSummary: StrategySummary = {
    name: "Funding Reset",
    candidates: Number(fundingStats.candidates ?? fundingCandidates.length),
    aSetups: Number(fundingStats.aSetups ?? 0),
    bSetups: Number(fundingStats.bSetups ?? 0),
    openPositions: fundingOpen,
    closedPositions: fundingClosed,
    openPnl: fundingOpenPnl,
    closedPnl: fundingClosedPnl,
  };

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "radial-gradient(circle at top, #111827 0, #020617 45%)", color: "#e5e7eb", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ marginBottom: 28 }}>
        <div style={{ color: "#38bdf8", fontWeight: 800, letterSpacing: 1 }}>RAI CRYPTO</div>
        <h1 style={{ fontSize: 38, margin: "8px 0 6px" }}>Crypto Strategy Dashboard</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          Paper trading prototype pentru Hyperliquid / AsterDex. Strategiile sunt grupate separat mai jos. Ultim update Pullback: {dateFmt(snapshot.updatedAt)} PDT.
        </p>
      </section>

      <StrategyComparisonPanel pullback={pullbackSummary} funding={fundingSummary} />

      <section style={{ marginBottom: 18, padding: 16, border: "1px solid #2563eb", borderRadius: 18, background: "rgba(37,99,235,.08)" }}>
        <div style={{ color: "#93c5fd", fontWeight: 900, letterSpacing: 1 }}>STRATEGIA 1</div>
        <h2 style={{ margin: "6px 0 4px" }}>Pullback Continuation</h2>
        <p style={{ color: "#94a3b8", margin: 0 }}>Toate tabelele de mai jos aparțin Strategiei 1 până la blocul Strategia 2.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Market regime" value={regime.label} tone={regime.label === "risk_on" ? "#22c55e" : regime.label === "risk_off" ? "#ef4444" : "#fbbf24"} />
        <StatCard label="BTC trend" value={regime.btcTrend} />
        <StatCard label="ETH trend" value={regime.ethTrend} />
        <StatCard label="Universe health" value={`${fmt(regime.universeHealthPct)}%`} />
        <StatCard label="Scanned" value={`${fmt(stats.scanned)}/${fmt(stats.expected)}`} />
        <StatCard label="Candidates" value={stats.candidates} tone="#38bdf8" />
        <StatCard label="Open paper" value={stats.openPaperPositions ?? openPositions.length} tone="#22c55e" />
        <StatCard label="Closed paper" value={stats.closedPaperPositions ?? closedPositions.length} />
      </section>

      <section style={{ ...panel, marginBottom: 22 }}>
        <h2 style={{ marginTop: 0 }}>Strategia 1 — Performance & Risk Panel</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <StatCard label="Total sim P/L" value={`$${totalPnl.toFixed(2)}`} tone={totalPnl >= 0 ? "#22c55e" : "#ef4444"} />
          <StatCard label="Open sim P/L" value={`$${openPnl.toFixed(2)}`} tone={openPnl >= 0 ? "#22c55e" : "#ef4444"} />
          <StatCard label="Closed sim P/L" value={`$${closedPnl.toFixed(2)}`} tone={closedPnl >= 0 ? "#22c55e" : "#ef4444"} />
          <StatCard label="Capital blocat" value={`$${openMargin.toFixed(0)}`} />
          <StatCard label="Open notional" value={`$${openNotional.toFixed(0)}`} />
          <StatCard label="Win / Loss" value={`${wins}/${losses}`} />
          <StatCard label="Best trade" value={bestTrade ? `${bestTrade.symbol} $${Number(simulatedPnl(bestTrade)).toFixed(2)}` : "—"} tone="#22c55e" />
          <StatCard label="Worst trade" value={worstTrade ? `${worstTrade.symbol} $${Number(simulatedPnl(worstTrade)).toFixed(2)}` : "—"} tone="#ef4444" />
        </div>
        <div style={{ marginTop: 14, color: "#94a3b8", fontSize: 13 }}>
          Equity curve closed trades: {equityPoints.length ? equityPoints.map((v, i) => <span key={i} style={{ display: "inline-block", marginRight: 8, color: v >= 0 ? "#22c55e" : "#ef4444" }}>#{i + 1}: ${v.toFixed(2)}</span>) : "—"}
        </div>
        <div style={{ marginTop: 8, color: regime.label === "risk_off" ? "#fca5a5" : "#94a3b8", fontWeight: 700 }}>
          Risk-off management: {regime.label === "risk_off" ? "ACTIVE — no new longs; winners >= +0.5R move SL to BE; losers <= -0.75R close defensively." : "standby"}
        </div>
      </section>

      <section style={{ ...panel, marginBottom: 22 }}>
        <h2 style={{ marginTop: 0 }}>Strategia 1 — Candidates</h2>
        {candidates.length === 0 ? <p style={{ color: "#94a3b8" }}>Niciun candidat acum.</p> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {candidates.map((candidate) => (
            <div key={`${candidate.symbol}-${candidate.side}`} style={{ border: "1px solid #334155", borderRadius: 14, padding: 14, background: "#0f172a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 22 }}>{candidate.symbol}</strong>
                  <Badge tone={candidate.side === "LONG" ? "#22c55e" : "#ef4444"}>{candidate.side}</Badge>
                  <Badge tone={candidate.grade === "A" ? "#22c55e" : "#fbbf24"}>Grade {candidate.grade}</Badge>
                </div>
                <strong style={{ color: "#38bdf8" }}>Score {fmt(candidate.score)}</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12, color: "#cbd5e1" }}>
                <div>Price: <b>{fmt(candidate.metrics?.price)}</b></div>
                <div>Entry: <b>{candidate.entryZone?.map(fmt).join(" – ")}</b></div>
                <div>Stop: <b>{fmt(candidate.stop)}</b></div>
                <div>RSI 1H: <b>{fmt(candidate.metrics?.rsi_1h)}</b></div>
                <div>RSI 4H: <b>{fmt(candidate.metrics?.rsi_4h)}</b></div>
                <div>RR: <b>{fmt(candidate.riskReward)}</b></div>
              </div>
              <ul style={{ color: "#94a3b8", marginBottom: 0 }}>
                {(candidate.reasons ?? []).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panel, marginBottom: 22 }}>
        <h2 style={{ marginTop: 0 }}>Strategia 1 — Real Money Simulation</h2>
        <p style={{ color: "#94a3b8", marginTop: -4 }}>
          Simulare fixa: margin $50 pe pozitie, leverage 3x, notional $150. Nu este executie reala.
        </p>
        {[...openPositions, ...closedPositions.slice(-10).reverse()].length === 0 ? <p style={{ color: "#94a3b8" }}>Nu exista pozitii de simulat.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {[...openPositions, ...closedPositions.slice(-10).reverse()].map((position) => {
            const pnl = simulatedPnl(position);
            const roi = simulatedRoiOnMargin(position);
            const pnlTone = Number(pnl ?? 0) >= 0 ? "#22c55e" : "#ef4444";
            const hit = stopHit(position);
            const distStop = distanceToStopPct(position);
            const stopPnl = pnlAtStop(position);
            return (
              <div key={`sim-${position.id}`} style={{ padding: 14, border: `1px solid ${isClosedPosition(position) ? "#475569" : "#22c55e"}`, borderRadius: 14, background: isClosedPosition(position) ? "#111827" : "#0f172a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 18 }}>{position.symbol} {position.side}</strong>
                    <Badge tone={statusTone(position)}>{statusLabel(position)}</Badge>
                    <span style={{ color: "#94a3b8" }}>{readableStatus(position)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <span style={{ color: pnlTone, fontWeight: 800 }}>P/L: {pnl === null ? "—" : `$${pnl.toFixed(2)}`}</span>
                    <span style={{ color: pnlTone, fontWeight: 800 }}>ROI: {roi === null ? "—" : `${roi.toFixed(2)}%`}</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, color: "#cbd5e1" }}>
                  <span>Margin: <b>$50</b></span>
                  <span>Lev: <b>3x</b></span>
                  <span>Notional: <b>$150</b></span>
                  <span>Entry: <b>{fmt(position.entryPrice)}</b></span>
                  <span>SL: <b>{fmt(position.stop)}</b></span>
                  <span style={{ color: hit ? "#ef4444" : "#22c55e" }}>SL status: <b>{hit ? "HIT" : "NOT HIT"}</b></span>
                  <span>Dist. to SL: <b>{distStop === null ? "—" : `${distStop.toFixed(2)}%`}</b></span>
                  <span>Loss if SL: <b style={{ color: "#ef4444" }}>{stopPnl === null ? "—" : `$${stopPnl.toFixed(2)}`}</b></span>
                  <span>Mark/Exit: <b>{fmt(position.exitPrice ?? position.lastPrice)}</b></span>
                  {position.closedAt ? <span>Closed at: <b>{dateFmt(position.closedAt)}</b></span> : <span>Checked: <b>{dateFmt(position.lastCheckedAt)}</b></span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>Strategia 1 — Open Paper Positions</h2>
          {openPositions.length === 0 ? <p style={{ color: "#94a3b8" }}>Nicio poziție open.</p> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {openPositions.map((position) => {
              const currentR = Number(position.currentR ?? 0);
              const maxR = Number(position.maxR ?? 0);
              const currentPct = progressFromR(currentR);
              const maxPct = progressFromR(maxR);
              const target = targetPrice(position);
              const hit = stopHit(position);
              const distStop = distanceToStopPct(position);
              const stopPnl = pnlAtStop(position);
              return (
                <div key={position.id} style={{ borderBottom: "1px solid #1f2937", paddingBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{position.symbol} {position.side}</strong>
                    <Badge tone={currentR >= 0 ? "#22c55e" : "#ef4444"}>{fmt(position.currentR)}R</Badge>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
                    Status: {position.status} · Entry {fmt(position.entryPrice)} · Last {fmt(position.lastPrice)} · Initial SL {fmt(position.originalStop ?? position.stop)} · Active SL {fmt(position.stop)} · TP1 {fmt(position.tp1Price)} · Runner TP {fmt(target)} · Max {fmt(position.maxR)}R
                  </div>
                  {position.activeStopReason || position.runnerStopReason ? (
                    <div style={{ color: "#38bdf8", fontSize: 13, marginTop: 4 }}>
                      Stop rule: {position.activeStopReason ?? position.runnerStopReason}
                    </div>
                  ) : null}
                  <div style={{ color: hit ? "#ef4444" : "#22c55e", fontSize: 13, marginTop: 4, fontWeight: 700 }}>
                    SL status: {hit ? "HIT" : "NOT HIT"} · Distance to SL: {distStop === null ? "—" : `${distStop.toFixed(2)}%`} · Sim loss if SL: {stopPnl === null ? "—" : `$${stopPnl.toFixed(2)}`}
                  </div>
                  {(position.actionLog ?? []).length ? (
                    <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 8 }}>
                      Ultime actiuni: {(position.actionLog ?? []).slice(-3).map((a) => `${a.action}${a.stop ? ` SL ${fmt(a.stop)}` : ""}${a.partialPrice ? ` TP1 ${fmt(a.partialPrice)}` : ""}`).join(" · ")}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 11, marginBottom: 6 }}>
                      <span>Stop -1R</span>
                      <span>Entry 0R</span>
                      <span>Target +2R</span>
                    </div>
                    <div style={{ position: "relative", height: 14, borderRadius: 999, background: "linear-gradient(90deg, #7f1d1d 0%, #334155 33%, #14532d 100%)", border: "1px solid #334155", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: "33.333%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.65)" }} />
                      <div style={{ position: "absolute", left: `${maxPct}%`, top: 1, bottom: 1, width: 2, background: "#fbbf24", boxShadow: "0 0 10px #fbbf24" }} />
                      <div style={{ position: "absolute", left: `${currentPct}%`, top: -3, width: 20, height: 20, marginLeft: -10, borderRadius: 999, background: currentR >= 0 ? "#22c55e" : "#ef4444", border: "2px solid #e5e7eb", boxShadow: "0 0 18px rgba(56,189,248,.35)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                      <span>Curent: <b style={{ color: currentR >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(currentR)}R</b></span>
                      <span>Max atins: <b style={{ color: "#fbbf24" }}>{fmt(maxR)}R</b></span>
                    </div>
                  </div>

                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Checked: {dateFmt(position.lastCheckedAt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>Strategia 1 — Closed Paper Positions</h2>
          {closedPositions.length === 0 ? <p style={{ color: "#94a3b8" }}>Încă nu avem poziții închise.</p> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {closedPositions.slice(-10).reverse().map((position) => (
              <div key={position.id} style={{ borderBottom: "1px solid #1f2937", paddingBottom: 10 }}>
                <strong>{position.symbol} {position.side}</strong>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Status: {position.status} · Exit {fmt(position.exitPrice)} · Result {fmt(position.rMultiple)}R · Reason {position.exitReason ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...panel, marginBottom: 22 }}>
        <div style={{ color: "#fbbf24", fontWeight: 900, letterSpacing: 1 }}>STRATEGIA 2</div>
        <h2 style={{ margin: "6px 0 0" }}>Funding Reset Reclaim</h2>
        {!fundingSnapshot ? <p style={{ color: "#fca5a5" }}>Nu gasesc snapshotul Funding Reset: {fundingDataPath}</p> : null}
        {fundingSnapshot ? (
          <>
            <p style={{ color: "#94a3b8", marginTop: -4 }}>
              Reset + funding neutral/negativ + reclaim 1H. Ultim update: {dateFmt(fundingSnapshot.updatedAt)} PDT.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12, marginBottom: 14 }}>
              <StatCard label="Regime" value={fundingRegime.label} tone={fundingRegime.label === "risk_off" ? "#ef4444" : fundingRegime.label === "risk_on" ? "#22c55e" : "#fbbf24"} />
              <StatCard label="Candidates" value={fundingStats.candidates} tone="#38bdf8" />
              <StatCard label="A/B" value={`${fmt(fundingStats.aSetups)}/${fmt(fundingStats.bSetups)}`} />
              <StatCard label="Open FRR" value={fundingStats.openPaperPositions ?? fundingOpen.length} tone="#22c55e" />
              <StatCard label="Closed FRR" value={fundingStats.closedPaperPositions ?? fundingClosed.length} />
              <StatCard label="Open P/L" value={`$${fundingOpenPnl.toFixed(2)}`} tone={fundingOpenPnl >= 0 ? "#22c55e" : "#ef4444"} />
              <StatCard label="Closed P/L" value={`$${fundingClosedPnl.toFixed(2)}`} tone={fundingClosedPnl >= 0 ? "#22c55e" : "#ef4444"} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Strategia 2 — Top Candidates</h3>
            {fundingCandidates.length === 0 ? <p style={{ color: "#94a3b8" }}>Niciun candidat Funding Reset acum.</p> : null}
            <div style={{ display: "grid", gap: 8 }}>
              {fundingCandidates.slice(0, 8).map((candidate) => (
                <div key={`frr-c-${candidate.symbol}-${candidate.side}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, padding: 10, border: "1px solid #334155", borderRadius: 12, background: "#0f172a" }}>
                  <strong>{candidate.symbol} {candidate.side}</strong>
                  <span>Grade: <b>{candidate.grade}</b></span>
                  <span>Score: <b>{fmt(candidate.score)}</b></span>
                  <span>Price: <b>{fmt(candidate.price)}</b></span>
                  <span>Funding: <b>{fmt(candidate.fundingRate)}</b></span>
                  <span>Drop72h: <b>{fmt(candidate.drop72hPct)}%</b></span>
                  <span>RSI1H: <b>{fmt(candidate.rsi1h)}</b></span>
                  <span>SL: <b>{fmt(candidate.stop)}</b></span>
                  <span>TP1: <b>{fmt(candidate.tp1Price)}</b></span>
                  <span>Runner: <b>{fmt(candidate.runnerTargetPrice)}</b></span>
                </div>
              ))}
            </div>
            <h3 style={{ margin: "16px 0 8px" }}>Strategia 2 — Open Paper Positions</h3>
            {fundingOpen.length === 0 ? <p style={{ color: "#94a3b8" }}>Nicio pozitie Funding Reset open.</p> : null}
            <div style={{ display: "grid", gap: 8 }}>
              {fundingOpen.map((position) => {
                const pnl = simulatedPnl(position);
                const hit = stopHit(position);
                return (
                  <div key={`frr-open-${position.id}`} style={{ padding: 12, border: "1px solid #fbbf24", borderRadius: 12, background: "rgba(251,191,36,.07)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <strong>{position.symbol} {position.side}</strong>
                        <Badge tone={statusTone(position)}>{statusLabel(position)}</Badge>
                        <span style={{ color: "#94a3b8" }}>{readableStatus(position)}</span>
                      </div>
                      <span style={{ color: Number(pnl ?? 0) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 800 }}>P/L: {pnl === null ? "—" : `$${pnl.toFixed(2)}`}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))", gap: 8, color: "#cbd5e1" }}>
                      <span>Entry: <b>{fmt(position.entryPrice)}</b></span>
                      <span>Last: <b>{fmt(position.lastPrice)}</b></span>
                      <span>SL: <b>{fmt(position.stop)}</b></span>
                      <span style={{ color: hit ? "#ef4444" : "#22c55e" }}>SL: <b>{hit ? "HIT" : "NOT HIT"}</b></span>
                      <span>TP1: <b>{fmt(position.tp1Price)}</b></span>
                      <span>Runner: <b>{fmt(position.runnerTargetPrice)}</b></span>
                      <span>R: <b>{fmt(position.currentR)}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
            <h3 style={{ margin: "16px 0 8px" }}>Strategia 2 — Closed Paper Positions</h3>
            {fundingClosed.length === 0 ? <p style={{ color: "#94a3b8" }}>Încă nu avem poziții Funding Reset închise.</p> : null}
            <div style={{ display: "grid", gap: 8 }}>
              {fundingClosed.slice(-10).reverse().map((position) => (
                <div key={`frr-closed-${position.id}`} style={{ padding: 10, border: "1px solid #475569", borderRadius: 12, background: "#111827" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{position.symbol} {position.side}</strong>
                    <Badge tone={statusTone(position)}>{statusLabel(position)}</Badge>
                    <span style={{ color: "#94a3b8" }}>{readableStatus(position)}</span>
                    <span>Exit: <b>{fmt(position.exitPrice)}</b></span>
                    <span>Result: <b>{fmt(position.rMultiple)}R</b></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
