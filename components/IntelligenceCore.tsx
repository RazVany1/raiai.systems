"use client";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

export default function IntelligenceCore({ coreSoundEnabled }: { coreSoundEnabled: boolean }) {
  const [signal, setSignal] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // mică animație de semnal
  useEffect(() => {
    const interval = setInterval(() => setSignal(Math.random()), 1500);
    return () => clearInterval(interval);
  }, []);

  // sunet de bază
  useEffect(() => {
    if (coreSoundEnabled && !audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 80; // ton joasă
      gain.gain.value = 0.04; // volum mic

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      audioCtxRef.current = ctx;
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } else if (!coreSoundEnabled && audioCtxRef.current) {
      oscillatorRef.current?.stop();
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, [coreSoundEnabled]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[9999] select-none">
      {/* efecte de energie */}
      <motion.div
        className="absolute w-[340px] h-[340px] rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute w-[220px] h-[220px] rounded-full border border-cyan-400/40 shadow-[0_0_30px_#00FFFF50]"
        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* consola centrală */}
      <motion.div
        className="relative flex flex-col items-center text-center text-cyan-400 font-mono px-6 py-8 bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-[0_0_25px_#00FFFF30]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.8 }}
      >
        <motion.h2
          className="text-2xl tracking-widest mb-2 drop-shadow-[0_0_10px_#00FFFF]"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 5 }}
        >
          CORE BLUEPRINT v1.0
        </motion.h2>

        <motion.p
          className="text-xs max-w-md text-cyan-300/80 leading-relaxed mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 2 }}
        >
          The RAI System operates as a distributed cognitive framework, combining high-context reasoning
          with adaptive learning nodes. Each iteration balances rational autonomy and human-aligned
          interpretation.
        </motion.p>

        {/* bara de semnal */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-cyan-200/70">SIGNAL STABILITY</span>
          <div className="w-32 h-[6px] bg-cyan-900/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-400"
              animate={{ width: `${signal * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
