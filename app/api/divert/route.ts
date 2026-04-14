import { NextResponse } from "next/server";

const rows = [
  { symbol: "BTCUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] },
  { symbol: "ETHUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] },
  { symbol: "SOLUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] },
  { symbol: "TAOUSDT", signal: "WATCH", side: "LONG", quality: "WATCH", invalidation: "recent setup low", notes: ["Near DiverT long structure"] },
  { symbol: "WLDUSDT", signal: "WATCH", side: "LONG", quality: "WATCH", invalidation: "recent setup low", notes: ["RSI structure close to valid"] },
  { symbol: "FETUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] },
  { symbol: "INJUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] },
  { symbol: "HBARUSDT", signal: "NO", side: "NONE", quality: "NONE", invalidation: null, notes: ["No active DiverT setup"] }
];

export async function GET() {
  return NextResponse.json({
    strategy: "DiverT Strategy",
    updatedAt: new Date().toISOString(),
    rows,
  });
}
