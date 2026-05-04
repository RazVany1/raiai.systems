"use client";

import { useEffect, useState } from "react";

type RankingRow = {
  project_id: string;
  nume: string;
  score: number;
  status: string;
  maturitate: string;
  prioritate_curenta: string;
  blocaj_principal: string;
  urmator_pas: string;
  owner_layer: string;
};

type BlockerRow = {
  project: string;
  blocker: string;
  needs_human: boolean;
  status: string;
};

type ProjectRow = {
  project_id: string;
  nume: string;
  tip: string;
  scop: string;
  status: string;
  maturitate: string;
  prioritate_curenta: string;
  ultim_progres: string;
  blocaj_principal: string;
  urmator_pas: string;
};

type BoardData = {
  version: string;
  generated_at: string;
  doctrine: Record<string, boolean>;
  projects: ProjectRow[];
  ranking: RankingRow[];
  executive_board: {
    ecosystem_status: {
      active: string[];
      in_constructie: string[];
      monitorizare: string[];
      in_pauza: string[];
    };
    priority_stack: RankingRow[];
    blocker_panel: BlockerRow[];
    action_now: {
      project: string | null;
      action: string;
      owner_layer: string | null;
      reason?: string;
    };
    alignment_panel: {
      top_priorities_count: number;
      ethical_risks: number;
      trust_risks: number;
      alignment_status: string;
    };
  };
};

const shellClass = "rounded-lg border border-slate-100/10 bg-slate-800/65 p-4 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm";

function badgeClass(value?: string) {
  const text = (value || "").toLowerCase();
  if (text.includes("ok") || text.includes("activ") || text.includes("functional")) return "text-emerald-300";
  if (text.includes("medie") || text.includes("constructie") || text.includes("partial")) return "text-amber-300";
  if (text.includes("pauza") || text.includes("blocat")) return "text-rose-300";
  return "text-slate-100";
}

export default function RaiChiefPage() {
  const [data, setData] = useState<BoardData | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/rai-chief?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
      setData(await res.json());
    };
    load().catch((error) => console.error("rai chief load failed", error));
  }, []);

  if (!data) {
    return <main className="mx-auto max-w-6xl p-6 text-slate-100">Loading RAI Chief...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-cyan-300">RAI Chief Executive Board</h1>
        <p className="mt-2 text-slate-300">Stratul executiv al doctrinei RAI: prioritati, blocaje, directie.</p>
      </div>

      <section className={`${shellClass} mb-5`}>
        <h2 className="text-xl font-semibold text-cyan-200">Doctrine</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {Object.entries(data.doctrine).map(([key, value]) => (
            <div key={key} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-center">
              <div className="text-sm text-slate-400 uppercase">{key}</div>
              <div className={`mt-1 text-lg font-semibold ${value ? "text-emerald-300" : "text-rose-300"}`}>{value ? "on" : "off"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={shellClass}><div className="text-sm text-slate-400">Proiecte active</div><div className="mt-2 text-3xl font-semibold text-slate-100">{data.executive_board.ecosystem_status.active.length}</div></div>
        <div className={shellClass}><div className="text-sm text-slate-400">In constructie</div><div className="mt-2 text-3xl font-semibold text-amber-300">{data.executive_board.ecosystem_status.in_constructie.length}</div></div>
        <div className={shellClass}><div className="text-sm text-slate-400">Top prioritati</div><div className="mt-2 text-3xl font-semibold text-cyan-300">{data.executive_board.alignment_panel.top_priorities_count}</div></div>
        <div className={shellClass}><div className="text-sm text-slate-400">Alignment</div><div className={`mt-2 text-2xl font-semibold ${badgeClass(data.executive_board.alignment_panel.alignment_status)}`}>{data.executive_board.alignment_panel.alignment_status}</div></div>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        <div className={shellClass}>
          <h2 className="text-xl font-semibold text-cyan-200">Action Now</h2>
          <p className="mt-3"><strong>Proiect:</strong> {data.executive_board.action_now.project || "-"}</p>
          <p className="mt-2"><strong>Actiune:</strong> {data.executive_board.action_now.action}</p>
          <p className="mt-2"><strong>Owner:</strong> {data.executive_board.action_now.owner_layer || "-"}</p>
          <p className="mt-2 text-slate-400">{data.executive_board.action_now.reason || ""}</p>
        </div>
        <div className={shellClass}>
          <h2 className="text-xl font-semibold text-cyan-200">Ecosystem Status</h2>
          <p className="mt-3"><strong>Active:</strong> {data.executive_board.ecosystem_status.active.join(", ") || "-"}</p>
          <p className="mt-2"><strong>In constructie:</strong> {data.executive_board.ecosystem_status.in_constructie.join(", ") || "-"}</p>
          <p className="mt-2"><strong>Monitorizare:</strong> {data.executive_board.ecosystem_status.monitorizare.join(", ") || "-"}</p>
          <p className="mt-2"><strong>In pauza:</strong> {data.executive_board.ecosystem_status.in_pauza.join(", ") || "-"}</p>
        </div>
      </section>

      <section className={`${shellClass} mb-5 overflow-x-auto`}>
        <h2 className="text-xl font-semibold text-cyan-200">Priority Stack</h2>
        <table className="mt-3 min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-300">
              <th className="px-3 py-2 text-left">Proiect</th><th className="px-3 py-2 text-left">Scor</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Maturitate</th><th className="px-3 py-2 text-left">Prioritate</th><th className="px-3 py-2 text-left">Urmator pas</th>
            </tr>
          </thead>
          <tbody>
            {data.executive_board.priority_stack.map((row) => (
              <tr key={row.project_id} className="border-b border-slate-800 text-slate-100">
                <td className="px-3 py-2">{row.nume}</td><td className="px-3 py-2">{row.score}</td><td className={`px-3 py-2 ${badgeClass(row.status)}`}>{row.status}</td><td className={`px-3 py-2 ${badgeClass(row.maturitate)}`}>{row.maturitate}</td><td className="px-3 py-2">{row.prioritate_curenta}</td><td className="px-3 py-2">{row.urmator_pas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${shellClass} mb-5 overflow-x-auto`}>
        <h2 className="text-xl font-semibold text-cyan-200">Blocker Panel</h2>
        <table className="mt-3 min-w-full border-collapse text-sm">
          <thead><tr className="border-b border-slate-700 text-slate-300"><th className="px-3 py-2 text-left">Proiect</th><th className="px-3 py-2 text-left">Blocaj</th><th className="px-3 py-2 text-left">Human</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {data.executive_board.blocker_panel.map((row) => (
              <tr key={row.project} className="border-b border-slate-800 text-slate-100">
                <td className="px-3 py-2">{row.project}</td><td className="px-3 py-2">{row.blocker}</td><td className="px-3 py-2">{row.needs_human ? "da" : "nu"}</td><td className={`px-3 py-2 ${badgeClass(row.status)}`}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={`${shellClass} overflow-x-auto`}>
        <h2 className="text-xl font-semibold text-cyan-200">Project Registry View</h2>
        <table className="mt-3 min-w-full border-collapse text-sm">
          <thead><tr className="border-b border-slate-700 text-slate-300"><th className="px-3 py-2 text-left">Nume</th><th className="px-3 py-2 text-left">Tip</th><th className="px-3 py-2 text-left">Scop</th><th className="px-3 py-2 text-left">Ultim progres</th><th className="px-3 py-2 text-left">Urmator pas</th></tr></thead>
          <tbody>
            {data.projects.map((row) => (
              <tr key={row.project_id} className="border-b border-slate-800 text-slate-100">
                <td className="px-3 py-2">{row.nume}</td><td className="px-3 py-2">{row.tip}</td><td className="px-3 py-2">{row.scop}</td><td className="px-3 py-2">{row.ultim_progres}</td><td className="px-3 py-2">{row.urmator_pas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-5 text-sm text-slate-500">Actualizat: {data.generated_at}</p>
    </main>
  );
}
