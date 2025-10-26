"use client";
import { useState } from "react";

interface ControlDockProps {
  onToggleCoreSound?: (state: boolean) => void;
}

export default function ControlDock({ onToggleCoreSound }: ControlDockProps) {
  const [coreSound, setCoreSound] = useState(false);

  const toggleCoreSound = () => {
    const newState = !coreSound;
    setCoreSound(newState);
    if (onToggleCoreSound) onToggleCoreSound(newState);
    console.log("🔊 Toggle Core Sound:", newState);
  };

  return (
    <div className="fixed bottom-6 left-6 bg-black/80 text-cyan-300 border border-cyan-500/50 rounded-2xl p-4 w-64 shadow-[0_0_25px_#00FFFF40] backdrop-blur-md z-50">
      <h3 className="text-base font-bold mb-3 text-cyan-400 tracking-widest">
        RAI CONTROL DOCK
      </h3>

      <button
        onClick={toggleCoreSound}
        className="w-full py-2 mb-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 rounded-md transition-all duration-300"
      >
        🔊 {coreSound ? "Disable Core Sound" : "Enable Core Sound"}
      </button>

      <button className="w-full py-2 mb-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 rounded-md transition-all duration-300">
        ⏸ Pause Animations
      </button>

      <button className="w-full py-2 mb-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 rounded-md transition-all duration-300">
        ✖ Disable Pulse Map
      </button>

      <button className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/40 rounded-md transition-all duration-300">
        🩺 Hide Diagnostics
      </button>
    </div>
  );
}
