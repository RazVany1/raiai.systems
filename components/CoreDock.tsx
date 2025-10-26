"use client";
import { useState, useEffect } from "react";

export default function CoreDock() {
  const [coreSound, setCoreSound] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Sunet scurt de activare (AI pulse)
    const sound = new Audio(
      "https://cdn.pixabay.com/audio/2022/03/15/audio_7b8e9c9c84.mp3"
    );
    sound.volume = 0.5;
    setAudio(sound);
  }, []);

  const toggleCoreSound = () => {
    const newState = !coreSound;
    setCoreSound(newState);

    if (newState && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => console.log("Autoplay blocked"));
    }

    console.log("🔊 Core Sound:", newState ? "Enabled" : "Disabled");
  };

  return (
    <div className="fixed bottom-36 left-6 bg-black/80 text-cyan-300 border border-cyan-500/50 rounded-2xl p-4 w-64 shadow-[0_0_25px_#00FFFF40] backdrop-blur-md z-50">
      <h3 className="text-base font-bold mb-3 text-cyan-400 tracking-widest">
        CORE DOCK
      </h3>

      <button
        onClick={toggleCoreSound}
        className={`w-full py-2 border border-cyan-400/40 rounded-md transition-all duration-300 ${
          coreSound
            ? "bg-cyan-500/50 hover:bg-cyan-400/70"
            : "bg-cyan-500/20 hover:bg-cyan-500/40"
        }`}
      >
        🔊 {coreSound ? "Disable Core Sound" : "Enable Core Sound"}
      </button>
    </div>
  );
}
