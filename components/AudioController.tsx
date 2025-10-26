// components/AudioController.tsx
"use client";
import { useEffect, useRef } from "react";

export default function AudioController() {
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const whooshRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const ambient = ambientRef.current;
    if (!ambient) return;

    ambient.volume = 0.15;
    ambient.loop = true;
    ambient.play().catch(() => {
      // autoplay restriction – user will trigger later
    });
  }, []);

  // funcție globală care poate fi apelată din alte componente
  const playWhoosh = () => {
    const whoosh = whooshRef.current;
    if (!whoosh) return;
    whoosh.currentTime = 0;
    whoosh.volume = 0.25;
    whoosh.play();
  };

  // atașăm funcția global la window pentru acces universal
  useEffect(() => {
    (window as any).playWhoosh = playWhoosh;
  }, []);

  return (
    <>
      <audio ref={ambientRef} src="/media/ambient-low.mp3" />
      <audio ref={whooshRef} src="/media/whoosh.mp3" />
    </>
  );
}
