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

function loadSnapshot(): PullbackSnapshot | null {
  try {
    const raw = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(raw) as PullbackSnapshot;
  } catch {
    return null;
  }
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

export default function CryptoPage() {
  const snapshot = loadSnapshot();

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

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "radial-gradient(circle at top, #111827 0, #020617 45%)", color: "#e5e7eb", fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ marginBottom: 28 }}>
        <div style={{ color: "#38bdf8", fontWeight: 800, letterSpacing: 1 }}>RAI CRYPTO</div>
        <h1 style={{ fontSize: 38, margin: "8px 0 6px" }}>Pullback Continuation Dashboard</h1>
        <p style={{ color: "#94a3b8", margin: 0 }}>
          Paper trading prototype pentru Hyperliquid / AsterDex. Ultim update: {dateFmt(snapshot.updatedAt)} PDT.
        </p>
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
        <h2 style={{ marginTop: 0 }}>Candidates</h2>
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

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>Open Paper Positions</h2>
          {openPositions.length === 0 ? <p style={{ color: "#94a3b8" }}>Nicio poziție open.</p> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {openPositions.map((position) => {
              const currentR = Number(position.currentR ?? 0);
              const maxR = Number(position.maxR ?? 0);
              const currentPct = progressFromR(currentR);
              const maxPct = progressFromR(maxR);
              const target = targetPrice(position);
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
          <h2 style={{ marginTop: 0 }}>Closed Paper Positions</h2>
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
    </main>
  );
}
