"use client";
import { motion } from "framer-motion";

export default function GlowButton({ text, href }: { text: string; href?: string }) {
  const onClick = () => {
    if (href) window.open(href, "_blank");
  };
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08, boxShadow: "0 0 25px #00ffff" }}
      transition={{ type: "spring", stiffness: 220 }}
      className="px-8 py-3 border border-cyan-400 rounded-xl text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
    >
      {text}
    </motion.button>
  );
}
