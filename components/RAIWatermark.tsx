"use client";
import { motion } from "framer-motion";

export default function RAIWatermark() {
  return (
    <motion.div
      className="fixed bottom-6 right-6 select-none pointer-events-none z-50"
      animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="text-cyan-400 font-bold text-3xl tracking-widest drop-shadow-[0_0_10px_#00FFFF]"
        style={{ textShadow: "0 0 10px rgba(0,255,255,0.7),0 0 20px rgba(0,255,255,0.5)" }}
      >
        ∞RAI
      </motion.div>
    </motion.div>
  );
}
