"use client";
import { motion } from "framer-motion";
import { useRAIState } from "../lib/raiState";

export default function ControlDock() {
  const {
    animations,
    pulse,
    diagnostics,
    toggleAnimations,
    togglePulse,
    toggleDiagnostics,
  } = useRAIState();

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

      <button onClick={toggleAnimations} className="hover:text-cyan-100 transition">
        {animations ? "⏸️ Pause Animations" : "▶️ Resume Animations"}
      </button>

      <button onClick={togglePulse} className="hover:text-cyan-100 transition">
        {pulse ? "🧩 Disable Pulse Map" : "🔁 Enable Pulse Map"}
      </button>

      <button onClick={toggleDiagnostics} className="hover:text-cyan-100 transition">
        {diagnostics ? "⚙️ Hide Diagnostics" : "🩺 Show Diagnostics"}
      </button>
    </motion.div>
  );
}
