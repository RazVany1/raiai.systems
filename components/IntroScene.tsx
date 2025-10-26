// components/IntroScene.tsx
"use client";
import { motion } from "framer-motion";
import GlowButton from "./GlowButton";
import RAIWatermark from "./RAIWatermark";

export default function IntroScene() {
  const handleAccess = () => {
    // Efectul sonor whoosh
    if ((window as any).playWhoosh) {
      (window as any).playWhoosh();
    }

    // Deschide blueprint-ul în tab nou
    window.open("/docs/RAI_Technical_Blueprint_v1.0_Vany.pdf", "_blank");

    // Scroll automat spre Overview (când va exista)
    const overview = document.getElementById("overview");
    if (overview) {
      overview.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-black overflow-hidden">
      {/* simbol ∞ emergent */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 1, 0.9], scale: [0.8, 1.05, 1] }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="text-6xl md:text-8xl font-bold text-cyan-400 mb-8 drop-shadow-[0_0_20px_#00FFFF]"
        style={{
          textShadow:
            "0 0 25px rgba(0,255,255,0.7), 0 0 50px rgba(0,255,255,0.4)",
        }}
      >
        ∞RAI
      </motion.div>

      {/* text fade-in */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="space-y-2 mb-10"
      >
        <p className="text-lg md:text-xl text-cyan-300 tracking-widest">
          RATIONAL AUTONOMOUS INTELLIGENCE
        </p>
        <p className="text-sm md:text-base text-cyan-200 opacity-70">
          A self-evolving AI economy architecture.
        </p>
      </motion.div>

      {/* buton Access Blueprint */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 4.5, duration: 0.8 }}
      >
        <GlowButton label="ACCESS BLUEPRINT" onClick={handleAccess} />
      </motion.div>

      {/* watermark activ */}
      <RAIWatermark />
    </div>
  );
}
