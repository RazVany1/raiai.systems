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
            {openPositions.map((position) => (
              <div key={position.id} style={{ borderBottom: "1px solid #1f2937", paddingBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{position.symbol} {position.side}</strong>
                  <Badge tone={Number(position.currentR ?? 0) >= 0 ? "#22c55e" : "#ef4444"}>{fmt(position.currentR)}R</Badge>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
                  Status: {position.status} · Entry {fmt(position.entryPrice)} · Last {fmt(position.lastPrice)} · Stop {fmt(position.stop)} · Max {fmt(position.maxR)}R
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Checked: {dateFmt(position.lastCheckedAt)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <h2 style={{ marginTop: 0 }}>Closed Paper Positions</h2>
          {closedPositions.length === 0 ? <p style={{ color: "#94a3b8" }}>Încă nu avem poziții închise.</p> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {closedPositions.slice(-10).reverse().map((position) => (
              <div key={position.id} style={{ borderBottom: "1px solid #1f2937", paddingBottom: 10 }}>
                <strong>{position.symbol} {position.side}</strong>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Status: {position.status} · Exit {fmt(position.exitPrice)} · Result {fmt(position.rMultiple)}R</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
