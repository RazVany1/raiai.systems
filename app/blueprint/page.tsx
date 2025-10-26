"use client";
import { motion } from "framer-motion";
import BlueprintScene from "../../components/BlueprintScene";
import BlueprintPanel from "../../components/BlueprintPanel";
import ModuleGrid from "../../components/ModuleGrid";
import PulseMap from "../../components/PulseMap";
import DiagnosticsSidebar from "../../components/DiagnosticsSidebar";
import ControlDock from "../../components/ControlDock";
import IntelligenceCore from "../../components/IntelligenceCore";
import CoreDock from "../../components/CoreDock";

export default function BlueprintPage() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Strat vizual principal */}
      <div className="absolute inset-0 z-0">
        <BlueprintScene />
        <PulseMap />
        <ModuleGrid />
      </div>

      {/* Strat UI */}
      <div className="relative z-10">
        {/* Titlu */}
        <motion.h1
          className="absolute top-12 left-1/2 -translate-x-1/2 text-4xl font-bold text-cyan-400 tracking-widest"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5 }}
        >
          RAI SYSTEM BLUEPRINT
        </motion.h1>

        {/* Panou central */}
        <motion.div
          className="absolute top-40 left-1/2 -translate-x-1/2 w-[420px] bg-black/70 border border-cyan-500/40 p-6 rounded-2xl shadow-[0_0_25px_#00FFFF40] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <h2 className="text-cyan-400 font-bold text-xl mb-3 tracking-widest">
            CORE BLUEPRINT v1.0
          </h2>
          <p className="text-cyan-200 text-sm leading-relaxed">
            The RAI System operates as a distributed cognitive framework,
            merging high-context reasoning with adaptive learning nodes.
            Each process is self-modular and dynamically adjusts based on
            computational intent and environmental context.
          </p>
          <p className="text-cyan-200 text-sm mt-3 leading-relaxed">
            Blueprint v1.0 establishes the foundation for subsequent
            intelligence expansion modules and system orchestration layers.
          </p>
        </motion.div>

        {/* Sidebar și panouri */}
        <DiagnosticsSidebar />
        <BlueprintPanel />
        <IntelligenceCore />

        {/* Control Dock (panoul existent) */}
        <ControlDock />

        {/* Core Dock (panoul nou pentru sunet) */}
        <CoreDock />
      </div>
    </main>
  );
}
