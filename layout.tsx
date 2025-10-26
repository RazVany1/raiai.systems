// app/layout.tsx
import "./globals.css";
import { Orbitron } from "next/font/google";
import { Metadata } from "next";
import RAIWatermark from "../components/RAIWatermark";
import AudioController from "../components/AudioController";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "RAI AI Systems",
  description: "Rational. Autonomous. Infinite.",
  openGraph: {
    title: "RAI AI Systems",
    description: "Rational. Autonomous. Infinite.",
    url: "https://raiai.systems",
    siteName: "RAI AI Systems",
    images: [
      {
        url: "/assets/rai-logo.svg",
        width: 1200,
        height: 630,
        alt: "RAI AI Systems",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.className} bg-black text-cyan-400 overflow-x-hidden`}
      >
        {/* Watermark and ambient sound always active */}
        <AudioController />
        <RAIWatermark />
        {children}
      </body>
    </html>
  );
}
