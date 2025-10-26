"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function IntelligenceCore() {
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSignal(Math.random());
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute bottom-24 right-24 z-40 text-cyan-400 font-mono select-none">
      <motion.div
        className="relative flex flex-col items-end"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2 }}
      >
        <motion.h2
          className="text-2xl tracking-widest mb-1"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          CORE BLUEPRINT v1.0
        </motion.h2>

        <motion.p
          className="text-xs max-w-md text-right leading-relaxed text-cyan-300/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 2 }}
        >
          The RAI System operates as a distributed cognitive framework — combining
          high-context reasoning with adaptive learning nodes. Each iteration balances
          rational autonomy and human-aligned interpretation.
        </motion.p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-cyan-200/70">SIGNAL STABILITY</span>
          <div className="w-24 h-[6px] bg-cyan-900/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400"
              animate={{ width: `${signal * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-cyan-400 rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2 + i * 0.5,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
