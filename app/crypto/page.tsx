"use client";

import { useEffect, useMemo, useState } from "react";

type SignalRow = {
  symbol: string;
  signal: string;
  side: string;
  quality: string;
  invalidation: string | null;
  notes: string[];
};

const profileA = {
  long: ["BTC", "ETH", "SOL", "LINK", "EOS"],
  short: ["XRP", "SOL", "BNB", "BTC"],
};

export default function CryptoDashboardPage() {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/divert", { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows || []);
      setUpdatedAt(data.updatedAt || "");
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const yesSignals = rows.filter((row) => row.signal === "YES").length;
    const watchSignals = rows.filter((row) => row.signal === "WATCH").length;
    const longBias = rows.filter((row) => row.side === "LONG").length;
    const shortBias = rows.filter((row) => row.side === "SHORT").length;
    return { yesSignals, watchSignals, longBias, shortBias };
  }, [rows]);

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_#00FFFF]">
              RAI Crypto Dashboard
            </h1>
            <p className="text-cyan-200">
              DiverT Strategy live board
            </p>
          </div>
          <div className="text-sm text-cyan-300">
            <p>Status: live dashboard v0.3</p>
            <p>Auto-refresh: 30s</p>
            <p>Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "loading..."}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">DiverT Strategy</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Price LL</li>
              <li>RSI HL</li>
              <li>RSI low 2 &gt; 30</li>
              <li>Bounce capture logic</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Signal Stats</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>YES: {stats.yesSignals}</li>
              <li>WATCH: {stats.watchSignals}</li>
              <li>Long bias: {stats.longBias}</li>
              <li>Short bias: {stats.shortBias}</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Profile A Best Fit</h2>
            <div className="space-y-2 text-sm text-cyan-100">
              <p><strong>Long:</strong> {profileA.long.join(", ")}</p>
              <p><strong>Short:</strong> {profileA.short.join(", ")}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Next</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Connect real scanner runtime</li>
              <li>Add post-exit tracking</li>
              <li>Add historical panel</li>
              <li>Add signal archive</li>
            </ul>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-cyan-300">Live DiverT Board</h2>
            <span className="text-sm text-cyan-300">YES / WATCH / NO</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-cyan-300">
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Signal</th>
                  <th className="px-3 py-3">Side</th>
                  <th className="px-3 py-3">Quality</th>
                  <th className="px-3 py-3">Invalidation</th>
                  <th className="px-3 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.symbol} className="border-b border-cyan-500/10 text-cyan-100">
                    <td className="px-3 py-3 font-medium">{row.symbol}</td>
                    <td className="px-3 py-3">{row.signal}</td>
                    <td className="px-3 py-3">{row.side}</td>
                    <td className="px-3 py-3">{row.quality}</td>
                    <td className="px-3 py-3">{row.invalidation || "-"}</td>
                    <td className="px-3 py-3">{row.notes.join(" | ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">DiverT Notes</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Defensive exit = loss of setup low</li>
              <li>Positive management = close on initial bounce</li>
              <li>Continue post-exit tracking for learning</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Current Focus</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Live dashboard</li>
              <li>DiverT only</li>
              <li>RAI Strategy deferred</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
