"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRAIState } from "../lib/raiState";

interface Metric {
  label: string;
  value: number;
}

export default function DiagnosticsSidebar() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "CPU LOAD", value: 0 },
    { label: "MEMORY STREAMS", value: 0 },
    { label: "SIGNAL FLOW", value: 0 },
    { label: "STABILITY INDEX", value: 0 },
  ]);

  const { diagnostics } = useRAIState();
  if (!diagnostics) return null;

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: Math.floor(Math.random() * 100),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed top-0 right-0 h-full w-64 bg-black/40 border-l border-cyan-400/30 backdrop-blur-md p-6 flex flex-col justify-center z-40"
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1.2 }}
    >
      <h3 className="text-cyan-400 text-lg font-bold mb-6 tracking-widest text-center">
        RAI DIAGNOSTICS
      </h3>
      <div className="space-y-6">
        {metrics.map((m, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs text-cyan-300 mb-1 tracking-widest">
              <span>{m.label}</span>
              <span>{m.value}%</span>
            </div>
            <motion.div
              className="h-1.5 bg-cyan-900 rounded-full overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: `${m.value}%` }}
              transition={{ duration: 1.5 }}
            >
              <div className="h-full bg-cyan-400" />
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
