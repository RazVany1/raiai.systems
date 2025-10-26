"use client";
import { motion } from "framer-motion";

export default function GlowButton({ text }: { text: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, boxShadow: "0 0 25px #00ffff" }}
      transition={{ type: "spring", stiffness: 200 }}
      className="px-8 py-3 border border-cyan-400 rounded-xl text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
    >
      {text}
    </motion.button>
  );
}
