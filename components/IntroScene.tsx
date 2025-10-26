"use client";
import { motion } from "framer-motion";

export default function IntroScene() {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center text-cyan-400 text-7xl font-bold"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 4, ease: "easeInOut" }}
    >
      ∞RAI
    </motion.div>
  );
}
