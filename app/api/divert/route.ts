import { NextResponse } from "next/server";

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "TAOUSDT", "ARBUSDT", "FETUSDT", "WLDUSDT", "SOLUSDT", "AVAXUSDT", "ADAUSDT", "HBARUSDT"];

type SwingPoint = { index: number; value: number };

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchKlines(symbol: string, interval = "4h", limit = 300) {
  const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
  return getJson(`${BINANCE_KLINES_URL}?${params.toString()}`);
}

function computeRsi(closes: number[], period = 14): Array<number | null> {
  if (closes.length < period + 1) return Array(closes.length).fill(null);
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const out: Array<number | null> = Array(closes.length).fill(null);
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function findLocalLows(values: Array<number | null>, left = 4, right = 4): SwingPoint[] {
  const points: SwingPoint[] = [];
  for (let i = left; i < values.length - right; i++) {
    const center = values[i];
    if (center == null) continue;
    const neighborhood = values.slice(i - left, i).concat(values.slice(i + 1, i + 1 + right)).filter((v): v is number => v != null);
    if (neighborhood.length && neighborhood.every((v) => center <= v)) {
      points.push({ index: i, value: center });
    }
  }
  return points;
}

function assessPatternContext(closes: number[]) {
  if (closes.length < 30) return "neutral";
  const recent = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const older = closes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;
  if (recent > older * 1.03) return "positive";
  if (recent < older * 0.97) return "negative";
  return "neutral";
}

async function analyzeSymbol(symbol: string) {
  const klines = await fetchKlines(symbol);
  const lows = klines.map((row: string[]) => Number(row[3]));
  const closes = klines.map((row: string[]) => Number(row[4]));
  const rsi = computeRsi(closes);
  const priceLows = findLocalLows(lows);
  const rsiLows = findLocalLows(rsi);
  const patternContext = assessPatternContext(closes);

  if (priceLows.length < 2 || rsiLows.length < 2) {
    return {
      symbol,
      signal: "NO",
      side: "NONE",
      quality: "UNKNOWN",
      invalidation: null,
      notes: ["Insufficient swing lows"],
      patternContext,
    };
  }

  const [p1, p2] = priceLows.slice(-2);
  const [r1, r2] = rsiLows.slice(-2);
  const priceLL = p2.value < p1.value;
  const rsiHL = r2.value > r1.value;
  const rsiAbove30 = r2.value > 30;

  if (priceLL && rsiHL && rsiAbove30) {
    let quality = "MEDIUM";
    if (r2.value >= 35 && r2.value - r1.value >= 3) quality = "GOOD";
    if (patternContext === "negative") quality = quality === "GOOD" ? "MEDIUM" : "FRAGILE";
    return {
      symbol,
      signal: "YES",
      side: "LONG",
      quality,
      invalidation: p2.value,
      notes: ["Base DiverT signal active", "Defensive exit = setup low"],
      patternContext,
    };
  }

  if (priceLL && rsiHL && !rsiAbove30) {
    return {
      symbol,
      signal: "WATCH",
      side: "LONG",
      quality: "WATCH",
      invalidation: p2.value,
      notes: ["Close to setup, RSI low 2 not above 30 yet"],
      patternContext,
    };
  }

  return {
    symbol,
    signal: "NO",
    side: "NONE",
    quality: "NONE",
    invalidation: null,
    notes: ["No active DiverT setup"],
    patternContext,
  };
}

export async function GET() {
  const rows = await Promise.all(
    SYMBOLS.map(async (symbol) => {
      try {
        return await analyzeSymbol(symbol);
      } catch (error) {
        return {
          symbol,
          signal: "ERROR",
          side: "NONE",
          quality: "UNKNOWN",
          invalidation: null,
          notes: [`Error: ${error instanceof Error ? error.message : "unknown"}`],
          patternContext: "unknown",
        };
      }
    })
  );

  return NextResponse.json({
    strategy: "DiverT Strategy",
    updatedAt: new Date().toISOString(),
    rows,
  });
}
