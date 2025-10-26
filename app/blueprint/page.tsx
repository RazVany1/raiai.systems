"use client";
import { motion } from "framer-motion";
import BlueprintScene from "../../components/BlueprintScene";
import BlueprintPanel from "../../components/BlueprintPanel";

export default function BlueprintPage() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Fundal cinematic */}
      <BlueprintScene />

      {/* Titlu */}
      <motion.h1
        className="absolute top-12 left-1/2 -translate-x-1/2 text-4xl font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_10px_#00FFFF]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
      >
        RAI SYSTEM BLUEPRINT
      </motion.h1>

      {/* Panou central */}
      <BlueprintPanel />

      {/* Watermark permanent */}
      <div className="fixed bottom-6 right-6 opacity-60 text-cyan-500 text-lg tracking-widest">
        ∞RAI
      </div>
    </main>
  );
}
