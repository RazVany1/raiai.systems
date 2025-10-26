"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function IntelligenceCore() {
  const [status, setStatus] = useState("Initializing cognitive modules...");
  const [log, setLog] = useState<string[]>([]);
  const [input, setInput] = useState("");

  // Actualizare automată a stării sistemului
  useEffect(() => {
    const states = [
      "Calibrating neural pathways...",
      "Optimizing data flow...",
      "Synchronizing memory clusters...",
      "Running introspection cycles...",
      "Ready for interaction."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setStatus(states[i]);
      i = (i + 1) % states.length;
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLog((prev) => [...prev, `> ${input}`, "RAI: Processing request..."]);
    setInput("");
    setTimeout(() => {
      setLog((prev) => [...prev, "RAI: Operation acknowledged."]);
    }, 1500);
  };

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-black/50 border border-cyan-400/30 rounded-2xl backdrop-blur-md p-4 text-cyan-200 z-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="text-cyan-400 text-sm mb-2 tracking-widest">
        {status}
      </div>

      <div className="h-32 overflow-y-auto text-xs font-mono mb-3 bg-black/30 p-2 rounded-md border border-cyan-400/20">
        {log.length === 0 ? (
          <div className="text-cyan-700">RAI Console active...</div>
        ) : (
          log.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          className="flex-1 bg-black/50 text-cyan-100 border border-cyan-400/30 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-cyan-400 text-black font-semibold rounded-md hover:bg-cyan-300 transition"
        >
          Send
        </button>
      </form>
    </motion.div>
  );
}
