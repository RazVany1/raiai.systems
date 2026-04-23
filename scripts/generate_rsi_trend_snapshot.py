import json
from datetime import datetime, timezone
from pathlib import Path
import sys

RUNTIME_PATH = Path(r"D:\RAI\rai_systems\runtime")
if str(RUNTIME_PATH) not in sys.path:
    sys.path.append(str(RUNTIME_PATH))

SCRIPT_PATH = Path(__file__).resolve().parent
if str(SCRIPT_PATH) not in sys.path:
    sys.path.append(str(SCRIPT_PATH))

from rai_crypto_signal_output_layer_v0_3 import RAICryptoSignalOutputLayerV3  # type: ignore
from hyper_price_utils import fetch_hyper_price  # type: ignore

SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "AAVEUSDT", "XMRUSDT", "DOGEUSDT", "BNBUSDT", "TAOUSDT", "SUIUSDT",
    "ARBUSDT", "ZROUSDT", "AVAXUSDT", "LINKUSDT", "ADAUSDT", "NEARUSDT", "BCHUSDT", "TONUSDT", "TRXUSDT", "UNIUSDT",
    "CRVUSDT", "WLDUSDT", "LTCUSDT", "JUPUSDT", "WIFUSDT", "RUNEUSDT", "AEROUSDT", "APTUSDT", "DOTUSDT", "HBARUSDT",
]

OUTPUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-trend-dashboard.json")


def find_pivots(values: list[float], window: int = 2) -> tuple[list[tuple[int, float]], list[tuple[int, float]]]:
    highs: list[tuple[int, float]] = []
    lows: list[tuple[int, float]] = []
    if len(values) < (window * 2 + 1):
        return highs, lows

    for i in range(window, len(values) - window):
        center = values[i]
        left = values[i - window:i]
        right = values[i + 1:i + window + 1]
        if all(center > x for x in left) and all(center >= x for x in right):
            highs.append((i, center))
        if all(center < x for x in left) and all(center <= x for x in right):
            lows.append((i, center))
    return highs, lows


def classify_trend(closes: list[float], highs: list[float], lows: list[float]) -> tuple[str, str]:
    if len(closes) < 60:
        return "unknown", "low"

    pivot_highs, pivot_lows = find_pivots(closes, window=2)
    recent_highs = pivot_highs[-3:]
    recent_lows = pivot_lows[-3:]

    sma_20 = sum(closes[-20:]) / 20
    sma_50 = sum(closes[-50:]) / 50
    current_close = closes[-1]

    up_structure = False
    down_structure = False

    if len(recent_highs) >= 2 and len(recent_lows) >= 2:
        up_structure = recent_highs[-1][1] > recent_highs[-2][1] and recent_lows[-1][1] > recent_lows[-2][1]
        down_structure = recent_highs[-1][1] < recent_highs[-2][1] and recent_lows[-1][1] < recent_lows[-2][1]

    above_ma = current_close > sma_20 > sma_50
    below_ma = current_close < sma_20 < sma_50

    if up_structure and above_ma:
        spread = (current_close / sma_50) - 1
        strength = "strong" if spread >= 0.04 else "medium"
        return "uptrend", strength

    if down_structure and below_ma:
        spread = (sma_50 / current_close) - 1
        strength = "strong" if spread >= 0.04 else "medium"
        return "downtrend", strength

    return "range", "low"


def main():
    layer = RAICryptoSignalOutputLayerV3(symbols=SYMBOLS)
    interest_rows = []
    trend_rows = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for symbol in SYMBOLS:
        try:
            klines = layer.fetch_binance_klines(symbol=symbol, interval="4h", limit=300)
            _, _, _, closes = layer.extract_ohlc(klines)
            rsi = layer.compute_rsi(closes)
            last_rsi = rsi[-1]
            if last_rsi is None:
                continue
            price = fetch_hyper_price(symbol)
            detected_at = datetime.fromtimestamp(int(klines[-1][0]) / 1000, tz=timezone.utc).isoformat()

            zone = None
            if 28 <= last_rsi <= 32:
                zone = "lower_interest"
            elif 68 <= last_rsi <= 72:
                zone = "upper_interest"

            if zone:
                interest_rows.append({
                    "symbol": symbol,
                    "rsi": round(float(last_rsi), 2),
                    "price": price,
                    "zone": zone,
                    "detectedAt": detected_at,
                    "timeframe": "4h",
                    "sourceVenue": "hyper",
                })

            _, highs, lows, closes = layer.extract_ohlc(klines)
            trend, strength = classify_trend(closes, highs, lows)
            trend_rows.append({
                "symbol": symbol,
                "trend": trend,
                "strength": strength,
                "price": price,
                "lastUpdate": detected_at,
                "timeframe": "4h",
                "sourceVenue": "hyper",
            })
        except Exception as exc:
            trend_rows.append({
                "symbol": symbol,
                "trend": "error",
                "strength": "unknown",
                "price": None,
                "lastUpdate": updated_at,
                "timeframe": "4h",
                "sourceVenue": "hyper",
                "error": str(exc),
            })

    payload = {
        "updatedAt": updated_at,
        "interestRows": interest_rows,
        "trendRows": trend_rows,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
