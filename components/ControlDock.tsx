"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function ControlDock() {
  const [animations, setAnimations] = useState(true);
  const [pulse, setPulse] = useState(true);
  const [diagnostics, setDiagnostics] = useState(true);

  // expune stările în fereastra globală pentru alte componente
  if (typeof window !== "undefined") {
    (window as any).RAI_STATE = { animations, pulse, diagnostics };
  }

  return (
    <motion.div
      className="fixed bottom-6 left-6 bg-black/40 border border-cyan-400/30 backdrop-blur-md rounded-xl p-4 text-cyan-300 text-sm tracking-wider z-50 flex flex-col gap-2"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      <h4 className="text-cyan-400 font-bold text-xs mb-1 tracking-widest">
        RAI CONTROL DOCK
      </h4>

      <button
        onClick={() => setAnimations(!animations)}
        className="hover:text-cyan-100 transition"
      >
        {animations ? "⏸️ Pause Animations" : "▶️ Resume Animations"}
      </button>

      <button
        onClick={() => setPulse(!pulse)}
        className="hover:text-cyan-100 transition"
      >
        {pulse ? "🧩 Disable Pulse Map" : "🔁 Enable Pulse Map"}
      </button>

      <button
        onClick={() => setDiagnostics(!diagnostics)}
        className="hover:text-cyan-100 transition"
      >
        {diagnostics ? "⚙️ Hide Diagnostics" : "🩺 Show Diagnostics"}
      </button>
    </motion.div>
  );
}
