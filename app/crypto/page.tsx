"use client";

const signalRows = [
  { symbol: "BTCUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "ETHUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "SOLUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "LINKUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "EOSUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "BNBUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
  { symbol: "XRPUSDT", signal: "NO", side: "-", quality: "-", invalidation: "-", notes: "No active Profile A setup" },
];

const profileA = {
  long: ["BTC", "ETH", "SOL", "LINK", "EOS"],
  short: ["XRP", "SOL", "BNB", "BTC"],
};

export default function CryptoDashboardPage() {
  (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_#00FFFF]">
          RAI Crypto Dashboard
        </h1>
        <p className="mb-8 text-cyan-200">
          Profile A scanner, DiverT Strategy, RAI Strategy family
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">RAI Strategy - Profile A</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Trend-pullback continuation</li>
              <li>Long + Short scanner</li>
              <li>Status: signal-ready</li>
              <li>Live now: no active setup</li>
            </ul>
          </section>

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
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Profile A Best Fit</h2>
            <div className="text-sm text-cyan-100">
              <p className="mb-2"><strong>Long:</strong> {profileA.long.join(", ")}</p>
              <p><strong>Short:</strong> {profileA.short.join(", ")}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Next</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Connect live scanner data</li>
              <li>Add watch state</li>
              <li>Add Profile B</li>
              <li>Add post-exit tracking</li>
            </ul>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
          <h2 className="mb-4 text-2xl font-semibold text-cyan-300">Live Signal Board</h2>
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
                {signalRows.map((row) => (
                  <tr key={row.symbol} className="border-b border-cyan-500/10 text-cyan-100">
                    <td className="px-3 py-3 font-medium">{row.symbol}</td>
                    <td className="px-3 py-3">{row.signal}</td>
                    <td className="px-3 py-3">{row.side}</td>
                                        <td className="px-3 py-3">{row.quality}</td>
                    <td className="px-3 py-3">{row.invalidation}</td>
                    <td className="px-3 py-3">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Backtest Snapshot</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>BTC long: 10 signals, avg max forward 3.56%</li>
              <li>ETH long: 3 signals, avg max forward 7.36%</li>
              <li>SOL long: 5 signals, avg max forward 4.56%</li>
              <li>XRP short: 31 signals, strong short profile</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <h2 className="mb-3 text-xl font-semibold text-cyan-300">Strategy Family</h2>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Profile A = cleaner trend coins</li>
              <li>Profile B = noisier mid-structure alts</li>
              <li>Profile C = chaotic / narrative assets</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
