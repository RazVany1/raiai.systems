"use client";
import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).playWhoosh) {
      (window as any).playWhoosh();
    }
  }, []);

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-5xl font-bold text-cyan-400 mb-6 drop-shadow-[0_0_10px_#00FFFF]">
        ∞RAI
      </h1>
      <p className="text-cyan-200 mb-10 tracking-wider">
        Rational. Autonomous. Infinite.
      </p>

      <button
        onClick={() => alert("Blueprint access coming soon")}
        className="border border-cyan-400 px-8 py-3 rounded-xl hover:bg-cyan-400 hover:text-black transition-all duration-300"
      >
        ACCESS BLUEPRINT
      </button>
    </main>
  );
}
