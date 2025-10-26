"use client";
import { useState } from "react";
import IntelligenceCore from "../../components/IntelligenceCore";
import ControlDock from "../../components/ControlDock";

export default function BlueprintPage() {
  const [coreSoundEnabled, setCoreSoundEnabled] = useState(false);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden text-cyan-400 font-mono">
      {/* Nucleul energetic */}
      <IntelligenceCore coreSoundEnabled={coreSoundEnabled} />

      {/* Panou de control — mereu deasupra */}
      <div className="absolute bottom-6 left-6 z-[99999]">
        <ControlDock onToggleCoreSound={setCoreSoundEnabled} />
      </div>
    </main>
  );
}
