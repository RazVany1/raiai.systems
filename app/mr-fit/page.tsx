"use client";

import { useEffect, useState } from "react";

type ComplianceRow = { label: string; value: string | number | null };
type TrendRow = {
  date: string;
  weight: number | null;
  sleep: number | null;
  energy: number | null;
  steps: number | null;
  sweetZero: string;
  mealBefore20: string;
  gym: string;
  cardio: string;
  symptoms: string;
};
type WeeklyRow = {
  period: string;
  verdict: string;
  average_weight?: number | null;
  average_sleep?: number | null;
  average_energy?: number | null;
  blocker?: string;
  priority_next_week?: string;
};

type DashboardData = {
  updatedAt?: string | null;
  mission: { destination: string; mode: string; startDate: string };
  summary: {
    latestWeight?: number | null;
    entriesCount: number;
    currentVerdict: string;
    currentVerdictClass?: string;
    weeklyVerdict: string;
    weeklyVerdictClass?: string;
    avgSleep?: number | null;
    avgEnergy?: number | null;
  };
  focus: {
    todayConclusion: string;
    todayPriority: string;
    weekConclusion: string;
    weekPriority: string;
    blocker: string;
  };
  complianceRows: ComplianceRow[];
  trendRows: TrendRow[];
  weeklyRows: WeeklyRow[];
};

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

function verdictClass(value?: string) {
  const text = (value || "").toLowerCase();
  if (text.includes("pe directie") || text.includes("buna")) return "text-emerald-300";
  if (text.includes("mixta") || text.includes("usor")) return "text-amber-300";
  if (text.includes("prud")) return "text-sky-300";
  if (text.includes("slaba") || text.includes("deviat")) return "text-rose-300";
  return "text-slate-100";
}

export default function MrFitDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/mr-fit?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
      setData(await res.json());
    };
    load().catch((error) => console.error("mr-fit dashboard load failed", error));
  }, []);

  if (!data) {
    return <main className="mx-auto max-w-6xl p-6 text-slate-100">Loading Mr.Fit dashboard...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-cyan-300">RAI Mr.Fit Dashboard</h1>
        <p className="mt-2 text-slate-300">Dashboard operational pentru progres, control si consistenta.</p>
      </div>

      <section className={`${shellClass} mb-5`}>
        <h2 className="text-xl font-semibold text-cyan-200">Destinatie</h2>
        <p className="mt-2"><strong>Directia:</strong> {data.mission.destination}</p>
        <p><strong>Mod de lucru:</strong> {data.mission.mode}</p>
        <p><strong>Start oficial:</strong> {data.mission.startDate}</p>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={shellClass}>
          <div className="text-sm text-slate-400">Status curent</div>
          <div className={`mt-2 text-2xl font-semibold ${verdictClass(data.summary.currentVerdict)}`}>{data.summary.currentVerdict}</div>
        </div>
        <div className={shellClass}>
          <div className="text-sm text-slate-400">Status saptamanal</div>
          <div className={`mt-2 text-2xl font-semibold ${verdictClass(data.summary.weeklyVerdict)}`}>{data.summary.weeklyVerdict}</div>
        </div>
        <div className={shellClass}>
          <div className="text-sm text-slate-400">Greutate curenta</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{data.summary.latestWeight ?? "-"}</div>
        </div>
        <div className={shellClass}>
          <div className="text-sm text-slate-400">Intrari totale</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{data.summary.entriesCount}</div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className={shellClass}>
          <h2 className="text-xl font-semibold text-cyan-200">Focus de azi</h2>
          <p className="mt-3"><strong>Concluzie:</strong> {data.focus.todayConclusion}</p>
          <p className="mt-2"><strong>Prioritate:</strong> {data.focus.todayPriority}</p>
        </div>
        <div className={shellClass}>
          <h2 className="text-xl font-semibold text-cyan-200">Focus saptamanal</h2>
          <p className="mt-3"><strong>Concluzie:</strong> {data.focus.weekConclusion}</p>
          <p className="mt-2"><strong>Blocaj:</strong> {data.focus.blocker}</p>
          <p className="mt-2"><strong>Prioritate:</strong> {data.focus.weekPriority}</p>
        </div>
      </section>

      <section className={`${shellClass} mb-5`}>
        <h2 className="text-xl font-semibold text-cyan-200">Compliance</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.complianceRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
              <div className="text-sm text-slate-400">{row.label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{row.value ?? "-"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${shellClass} mb-5 overflow-x-auto`}>
        <h2 className="text-xl font-semibold text-cyan-200">Trend zilnic</h2>
        {data.trendRows.length === 0 ? (
          <p className="mt-3 text-slate-400">Nu exista inca intrari zilnice.</p>
        ) : (
          <table className="mt-3 min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Greutate</th>
                <th className="px-3 py-2 text-left">Somn</th>
                <th className="px-3 py-2 text-left">Energie</th>
                <th className="px-3 py-2 text-left">Pasi</th>
                <th className="px-3 py-2 text-left">Dulce zero</th>
                <th className="px-3 py-2 text-left">Masa ≤ 20</th>
                <th className="px-3 py-2 text-left">Sala</th>
                <th className="px-3 py-2 text-left">Cardio</th>
                <th className="px-3 py-2 text-left">Simptome</th>
              </tr>
            </thead>
            <tbody>
              {data.trendRows.map((row) => (
                <tr key={row.date} className="border-b border-slate-800 text-slate-100">
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.weight ?? "-"}</td>
                  <td className="px-3 py-2">{row.sleep ?? "-"}</td>
                  <td className="px-3 py-2">{row.energy ?? "-"}</td>
                  <td className="px-3 py-2">{row.steps ?? "-"}</td>
                  <td className="px-3 py-2">{row.sweetZero}</td>
                  <td className="px-3 py-2">{row.mealBefore20}</td>
                  <td className="px-3 py-2">{row.gym}</td>
                  <td className="px-3 py-2">{row.cardio}</td>
                  <td className="px-3 py-2">{row.symptoms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${shellClass} overflow-x-auto`}>
        <h2 className="text-xl font-semibold text-cyan-200">Review-uri saptamanale</h2>
        {data.weeklyRows.length === 0 ? (
          <p className="mt-3 text-slate-400">Nu exista inca review-uri saptamanale.</p>
        ) : (
          <table className="mt-3 min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300">
                <th className="px-3 py-2 text-left">Perioada</th>
                <th className="px-3 py-2 text-left">Verdict</th>
                <th className="px-3 py-2 text-left">Greutate medie</th>
                <th className="px-3 py-2 text-left">Somn mediu</th>
                <th className="px-3 py-2 text-left">Energie medie</th>
                <th className="px-3 py-2 text-left">Blocaj</th>
                <th className="px-3 py-2 text-left">Prioritate</th>
              </tr>
            </thead>
            <tbody>
              {data.weeklyRows.map((row) => (
                <tr key={row.period} className="border-b border-slate-800 text-slate-100">
                  <td className="px-3 py-2">{row.period}</td>
                  <td className={`px-3 py-2 ${verdictClass(row.verdict)}`}>{row.verdict}</td>
                  <td className="px-3 py-2">{row.average_weight ?? "-"}</td>
                  <td className="px-3 py-2">{row.average_sleep ?? "-"}</td>
                  <td className="px-3 py-2">{row.average_energy ?? "-"}</td>
                  <td className="px-3 py-2">{row.blocker ?? "-"}</td>
                  <td className="px-3 py-2">{row.priority_next_week ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="mt-5 text-sm text-slate-500">Actualizat: {data.updatedAt || "-"}</p>
    </main>
  );
}
