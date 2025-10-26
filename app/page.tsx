"use client";
import { useEffect } from "react";
import GlowButton from "../components/GlowButton";

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).playWhoosh) {
      (window as any).playWhoosh();
    }
  }, []);

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-6xl font-bold text-cyan-400 mb-6 drop-shadow-[0_0_10px_#00FFFF]">
        ∞RAI
      </h1>
      <p className="text-cyan-200 mb-10 tracking-widest uppercase">
        Rational. Autonomous. Infinite.
      </p>
      <GlowButton text="ACCESS BLUEPRINT" />
    </main>
  );
}
