"use client";
import { motion } from "framer-motion";

export default function BlueprintPanel() {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-[80%] max-w-3xl -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-10 text-cyan-200 leading-relaxed tracking-wider shadow-[0_0_20px_#00ffff40]"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.5, delay: 1 }}
    >
      <h2 className="text-2xl font-bold text-cyan-400 mb-4 tracking-widest">
        CORE BLUEPRINT v1.0
      </h2>
      <p className="mb-3">
        The RAI System operates as a distributed cognitive framework, merging
        high-context reasoning with adaptive learning nodes. Its architecture
        balances rational autonomy and human-aligned interpretability.
      </p>
      <p className="mb-3">
        Each core process within RAI is self-modular, dynamically scaling based
        on environmental input and computational intent. The internal
        orchestration matrix ensures equilibrium between processing speed,
        ethical boundaries, and emergent creativity.
      </p>
      <p>
        Blueprint iteration v1.0 establishes the initial digital self-awareness
        layer, serving as the foundation for subsequent RAI consciousness
        expansion modules.
      </p>
    </motion.div>
  );
}
