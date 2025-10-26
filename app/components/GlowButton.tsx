// components/GlowButton.tsx
"use client";
import { motion } from "framer-motion";

interface GlowButtonProps {
  label: string;
  onClick?: () => void;
}

export default function GlowButton({ label, onClick }: GlowButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, boxShadow: "0 0 25px #00FFFF" }}
      whileTap={{ scale: 0.95 }}
      className="relative px-8 py-3 border border-cyan-400 rounded-full text-cyan-400 tracking-widest font-semibold uppercase bg-transparent hover:bg-cyan-400 hover:text-black transition-all duration-300"
    >
      <span className="absolute inset-0 rounded-full blur-md bg-cyan-400 opacity-20 animate-pulse"></span>
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
