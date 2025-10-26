"use client";
import { useState } from "react";

export default function ControlDock({ onToggleCoreSound }: { onToggleCoreSound: (state: boolean) => void }) {
  const [coreSound, setCoreSound] = useState(false);

  const toggleCoreSound = () => {
    const newState = !coreSound;
    setCoreSound(newState);
    onToggleCoreSound(newState);
  };

  return (
    <div className="absolute bottom-6 left-6 bg-black/50 text-cyan-300 font-mono text-xs px-4 py-3 rounded-lg border border-cyan-500/30 backdrop-blur-sm space-y-2">
      <div>RAI CONTROL DOCK</div>
      <button className="block hover:text-cyan-100 transition" onClick={toggleCoreSound}>
        🔊 {coreSound ? "Disable Core Sound" : "Enable Core Sound"}
      </button>
      <button className="block hover:text-cyan-100 transition">⏸ Pause Animations</button>
      <button className="block hover:text-cyan-100 transition">✖ Disable Pulse Map</button>
      <button className="block hover:text-cyan-100 transition">🩺 Hide Diagnostics</button>
    </div>
  );
}
