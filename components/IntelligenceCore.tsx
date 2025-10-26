"use client";
import React, { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";

export default function IntelligenceCore() {
  console.log("🧠 IntelligenceCore mounted!"); // ✅ debug vizual în consolă

  const [status, setStatus] = useState("Initializing cognitive modules...");
  const [log, setLog] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    console.log("✅ IntelligenceCore useEffect active");
    setVisible(true);

    const states = [
      "Calibrating neural pathways...",
      "Optimizing data flow...",
      "Synchronizing memory clusters...",
      "Running introspection cycles...",
      "Ready for interaction.",
    ];

    let i = 0;
    const interval = setInterval(() => {
      setStatus(states[i]);
      i = (i + 1) % states.length;
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLog((prev) => [...prev, `> ${input}`, "RAI: Processing request..."]);
    setInput("");
    setTimeout(() => {
      setLog((prev) => [...prev, "RAI: Operation acknowledged."]);
    }, 1500);
  };

  if (!visible) return null;

  return (
    <motion.div
      id="rai-console"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-black/70 border border-cyan-400/40 rounded-2xl backdrop-blur-md p-4 text-cyan-200 z-[999999] shadow-[0_0_30px_#00FFFF80]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2 }}
    >
      <div className="text-cyan-400 text-sm mb-2 tracking-widest font-semibold text-center">
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
