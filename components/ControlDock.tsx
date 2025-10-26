"use client";
import { useState } from "react";

export default function ControlDock({ onToggleCoreSound }: { onToggleCoreSound: (state: boolean) => void }) {
  const [coreSound, setCoreSound] = useState(false);

  const toggleCoreSound = () => {
    const newState = !coreSound;
    setCoreSound(newState);
    onToggleCoreSound(newState);
    console.log("🔊 Toggle Core Sound:", newState); // verificare în consola browserului
  };

  return (
    <div className="bg-black/70 text-cyan-300 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md w-60 shadow-[0_0_20px_#00FFFF30] space-y-2">
      <h3 className="text-sm font-bold mb-2 text-cyan-400 tracking-widest">
        RAI CONTROL DOCK
      </h3>

      <button
        onClick={toggleCoreSound}
        className="block w-full text-left hover:text-cyan-100 transition"
      >
        🔊 {coreSound ? "Disable Core Sound" : "Enable Core Sound"}
      </button>

      <button className="block w-full text-left hover:text-cyan-100 transition">
        ⏸ Pause Animations
      </button>
      <button className="block w-full text-left hover:text-cyan-100 transition">
        ✖ Disable Pulse Map
      </button>
      <button className="block w-full text-left hover:text-cyan-100 transition">
        🩺 Hide Diagnostics
      </button>
    </div>
  );
}
