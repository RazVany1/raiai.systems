// app/page.tsx
import IntroScene from "../components/IntroScene";
import AudioController from "../components/AudioController";

export default function HomePage() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      <AudioController />
      <IntroScene />
    </main>
  );
}
