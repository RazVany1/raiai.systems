"use client";
import { useState } from "react";
import IntelligenceCore from "../../components/IntelligenceCore";
import ControlDock from "../../components/ControlDock";
import DiagnosticsSidebar from "../../components/DiagnosticsSidebar";
import BlueprintScene from "../../components/BlueprintScene";
import PulseMap from "../../components/PulseMap";
import ModuleGrid from "../../components/ModuleGrid";

export default function BlueprintPage() {
  const [coreSoundEnabled, setCoreSoundEnabled] = useState(false);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden text-cyan-400 font-mono">
      {/* STRATURILE VIZUALE */}
      <div className="absolute inset-0 z-0">
        <BlueprintScene />
        <PulseMap />
        <ModuleGrid />
      </div>

      {/* CONȚINUT PRINCIPAL */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <IntelligenceCore coreSoundEnabled={coreSoundEnabled} />
      </div>

      {/* CONTROL DOCK (STÂNGA JOS) */}
      <div className="absolute bottom-6 left-6 z-50">
        <ControlDock onToggleCoreSound={setCoreSoundEnabled} />
      </div>

      {/* DIAGNOSTICS (DREAPTA SUS) */}
      <div className="absolute top-6 right-6 z-40">
        <DiagnosticsSidebar />
      </div>
    </main>
  );
}
