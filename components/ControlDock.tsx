"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Play, Pause, Cpu, Eye } from "lucide-react";

export default function ControlDock() {
  const [active, setActive] = useState(true);
  const [showCore, setShowCore] = useState(true);

  return (
    <motion.div
      className="fixed bottom-8 left-8 z-50 flex flex-col items-start gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2 }}
    >
      <div className="text-cyan-400 font-semibold text-xs mb-1 tracking-widest">
        CONTROL DOCK
      </div>

      <div className="flex flex-col gap-2 bg-black/50 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-[0_0_15px_#00FFFF30]">
        {/* Sistem on/off */}
        <button
          onClick={() => setActive(!active)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
            active
              ? "border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10"
              : "border-cyan-900 text-cyan-600 hover:bg-cyan-900/40"
          }`}
        >
          {active ? <Pause size={14} /> : <Play size={14} />}
          {active ? "Pause System" : "Activate System"}
        </button>

        {/* Toggle AI Core */}
        <button
          onClick={() => setShowCore(!showCore)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10 transition"
        >
          <Cpu size={14} />
          {showCore ? "Hide Core" : "Show Core"}
        </button>

        {/* Blueprint Visibility */}
        <button
          onClick={() => {
            const blueprint = document.querySelector("#rai-blueprint");
            if (blueprint) {
              const isHidden = blueprint.classList.toggle("opacity-0");
              blueprint.classList.toggle("pointer-events-none", isHidden);
            }
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10 transition"
        >
          <Eye size={14} />
          Toggle Blueprint
        </button>
      </div>

      {/* Status */}
      <motion.div
        className="text-cyan-300/70 text-xs mt-2"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 5 }}
      >
        {active
          ? "SYSTEM ACTIVE · SIGNAL FLOW OPTIMAL"
          : "SYSTEM ON STANDBY"}
      </motion.div>
    </motion.div>
  );
}
