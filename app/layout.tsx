import "./globals.css";
import { Orbitron } from "next/font/google";
import AudioController from "../components/AudioController";
import RAIWatermark from "../components/RAIWatermark";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400","500","700"] });

export const metadata = {
  title: "RAI AI Systems",
  description: "Rational. Autonomous. Infinite."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${orbitron.className} bg-black text-cyan-400 min-h-screen overflow-x-hidden`}>
        <AudioController />
        <RAIWatermark />
        {children}
      </body>
    </html>
  );
}
