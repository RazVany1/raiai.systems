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


def classify_trend(closes: list[float]) -> tuple[str, str]:
    if len(closes) < 40:
        return "unknown", "low"
    sma_10 = sum(closes[-10:]) / 10
    sma_20 = sum(closes[-20:]) / 20
    sma_40 = sum(closes[-40:]) / 40

    if sma_10 > sma_20 > sma_40:
        strength = "strong" if (sma_10 / sma_40) > 1.03 else "medium"
        return "uptrend", strength
    if sma_10 < sma_20 < sma_40:
        strength = "strong" if (sma_40 / sma_10) > 1.03 else "medium"
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

            trend, strength = classify_trend(closes)
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
