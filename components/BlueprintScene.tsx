"use client";
import { motion } from "framer-motion";

export default function BlueprintScene() {
  return (
    <motion.div
      className="absolute inset-0 bg-gradient-to-b from-black via-[#001a1a] to-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      {/* Rețea cyan */}
      <div className="absolute inset-0 opacity-25">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="#00ffff"
                strokeWidth="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Efect de puls luminos */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,255,255,0.25), transparent 70%)",
        }}
      />
    </motion.div>
  );
}
