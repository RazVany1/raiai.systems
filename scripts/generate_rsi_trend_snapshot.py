import json
from datetime import datetime, timezone, timedelta
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


def ema(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for value in values[1:]:
        out.append((value * k) + (out[-1] * (1 - k)))
    return out


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


def score_to_strength_signal(score: int, trend_name: str, structure_valid: bool, ema_aligned: bool) -> tuple[str, str, str]:
    if score >= 80 and structure_valid and ema_aligned:
        return trend_name, "strong", "STRONG"
    if 60 <= score <= 79 and structure_valid:
        return trend_name, "medium", "MODERATE"
    if 40 <= score <= 59:
        return trend_name, "low", "WEAK"
    return "range", "low", "NONE"


def detect_uptrend(closes: list[float], highs: list[float], lows: list[float]) -> dict:
    if len(closes) < 220:
        return {
            "trend": "range",
            "strength": "low",
            "score": 0,
            "trendSignal": "NONE",
            "emaAligned": False,
            "breakoutConfirmed": False,
            "lastHigherHigh": None,
            "lastHigherLow": None,
            "lastLowerHigh": None,
            "lastLowerLow": None,
        }

    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    pivot_highs, _ = find_pivots(highs, window=2)
    _, swing_lows = find_pivots(lows, window=2)

    recent_highs = pivot_highs[-3:]
    recent_lows = swing_lows[-3:]

    structure_valid = False
    last_hh = None
    last_hl = None
    if len(recent_highs) >= 2 and len(recent_lows) >= 2:
        last_hh = recent_highs[-1][1]
        prev_hh = recent_highs[-2][1]
        last_hl = recent_lows[-1][1]
        prev_hl = recent_lows[-2][1]
        structure_valid = last_hh > prev_hh and last_hl > prev_hl

    no_hl_break = bool(last_hl is not None and closes[-1] >= last_hl)
    ema_aligned = closes[-1] > ema50[-1] and ema50[-1] > ema200[-1]

    breakout_confirmed = False
    if len(pivot_highs) >= 2:
        previous_swing_high_value = pivot_highs[-2][1]
        breakout_confirmed = any(close > previous_swing_high_value for close in closes[-10:])

    correction_healthy = False
    if len(closes) >= 12:
        recent_pullback_low = min(lows[-10:])
        correction_healthy = recent_pullback_low >= ema50[-1] or recent_pullback_low >= ema200[-1]

    bullish_closes = sum(1 for i in range(len(closes) - 8, len(closes)) if i > 0 and closes[i] > closes[i - 1])
    net_positive = closes[-1] > closes[-8]
    bullish_candle_dominance = bullish_closes >= 5 and net_positive

    score = 0
    if structure_valid:
        score += 40
    if ema_aligned:
        score += 25
    if breakout_confirmed:
        score += 15
    if no_hl_break:
        score += 10
    if bullish_candle_dominance:
        score += 10

    if not no_hl_break and last_hl is not None:
        score = min(score, 39)

    trend, strength, signal = score_to_strength_signal(score, "uptrend", structure_valid, ema_aligned)

    if not correction_healthy and trend == "uptrend" and signal == "WEAK":
        trend = "range"
        signal = "NONE"
        score = min(score, 39)
        strength = "low"

    return {
        "trend": trend,
        "strength": strength,
        "score": score,
        "trendSignal": signal,
        "emaAligned": ema_aligned,
        "breakoutConfirmed": breakout_confirmed,
        "lastHigherHigh": round(last_hh, 6) if last_hh is not None else None,
        "lastHigherLow": round(last_hl, 6) if last_hl is not None else None,
        "lastLowerHigh": None,
        "lastLowerLow": None,
    }


def detect_downtrend(closes: list[float], highs: list[float], lows: list[float]) -> dict:
    if len(closes) < 220:
        return {
            "trend": "range",
            "strength": "low",
            "score": 0,
            "trendSignal": "NONE",
            "emaAligned": False,
            "breakoutConfirmed": False,
            "lastHigherHigh": None,
            "lastHigherLow": None,
            "lastLowerHigh": None,
            "lastLowerLow": None,
        }

    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    pivot_highs, _ = find_pivots(highs, window=2)
    _, swing_lows = find_pivots(lows, window=2)

    recent_highs = pivot_highs[-3:]
    recent_lows = swing_lows[-3:]

    structure_valid = False
    last_lh = None
    last_ll = None
    if len(recent_highs) >= 2 and len(recent_lows) >= 2:
        last_lh = recent_highs[-1][1]
        prev_lh = recent_highs[-2][1]
        last_ll = recent_lows[-1][1]
        prev_ll = recent_lows[-2][1]
        structure_valid = last_lh < prev_lh and last_ll < prev_ll

    no_lh_break = bool(last_lh is not None and closes[-1] <= last_lh)
    ema_aligned = closes[-1] < ema50[-1] and ema50[-1] < ema200[-1]

    breakout_confirmed = False
    if len(swing_lows) >= 2:
        previous_swing_low_value = swing_lows[-2][1]
        breakout_confirmed = any(close < previous_swing_low_value for close in closes[-10:])

    correction_healthy = False
    if len(closes) >= 12:
        recent_pullback_high = max(highs[-10:])
        correction_healthy = recent_pullback_high <= ema50[-1] or recent_pullback_high <= ema200[-1]

    bearish_closes = sum(1 for i in range(len(closes) - 8, len(closes)) if i > 0 and closes[i] < closes[i - 1])
    net_negative = closes[-1] < closes[-8]
    bearish_candle_dominance = bearish_closes >= 5 and net_negative

    score = 0
    if structure_valid:
        score += 40
    if ema_aligned:
        score += 25
    if breakout_confirmed:
        score += 15
    if no_lh_break:
        score += 10
    if bearish_candle_dominance:
        score += 10

    if not no_lh_break and last_lh is not None:
        score = min(score, 39)

    trend, strength, signal = score_to_strength_signal(score, "downtrend", structure_valid, ema_aligned)

    if not correction_healthy and trend == "downtrend" and signal == "WEAK":
        trend = "range"
        signal = "NONE"
        score = min(score, 39)
        strength = "low"

    return {
        "trend": trend,
        "strength": strength,
        "score": score,
        "trendSignal": signal,
        "emaAligned": ema_aligned,
        "breakoutConfirmed": breakout_confirmed,
        "lastHigherHigh": None,
        "lastHigherLow": None,
        "lastLowerHigh": round(last_lh, 6) if last_lh is not None else None,
        "lastLowerLow": round(last_ll, 6) if last_ll is not None else None,
    }


def detect_trend(closes: list[float], highs: list[float], lows: list[float]) -> dict:
    up = detect_uptrend(closes, highs, lows)
    down = detect_downtrend(closes, highs, lows)

    if up["score"] >= down["score"] and up["trend"] == "uptrend":
        return up
    if down["trend"] == "downtrend":
        return down

    return {
        "trend": "range",
        "strength": "low",
        "score": max(up["score"], down["score"]),
        "trendSignal": "NONE",
        "emaAligned": up["emaAligned"] if up["score"] >= down["score"] else down["emaAligned"],
        "breakoutConfirmed": up["breakoutConfirmed"] if up["score"] >= down["score"] else down["breakoutConfirmed"],
        "lastHigherHigh": up.get("lastHigherHigh"),
        "lastHigherLow": up.get("lastHigherLow"),
        "lastLowerHigh": down.get("lastLowerHigh"),
        "lastLowerLow": down.get("lastLowerLow"),
    }


def find_prior_rsi_anchor(rsi: list[float | None], klines: list, zone: str) -> dict:
    current_index = len(rsi) - 1
    if current_index <= 0:
        return {"anchorRsi": None, "anchorTime": None}

    if zone == "upper_interest":
        threshold = 80
        for i in range(current_index - 1, -1, -1):
            value = rsi[i]
            if value is not None and value >= threshold:
                return {
                    "anchorRsi": round(float(value), 2),
                    "anchorTime": datetime.fromtimestamp(int(klines[i][0]) / 1000, tz=timezone.utc).isoformat(),
                }
    elif zone == "lower_interest":
        threshold = 20
        for i in range(current_index - 1, -1, -1):
            value = rsi[i]
            if value is not None and value <= threshold:
                return {
                    "anchorRsi": round(float(value), 2),
                    "anchorTime": datetime.fromtimestamp(int(klines[i][0]) / 1000, tz=timezone.utc).isoformat(),
                }

    return {"anchorRsi": None, "anchorTime": None}


def find_rsi_divergence(rsi: list[float | None], price_pivots: list[tuple[int, float]], rsi_pivots: list[tuple[int, float]], side: str) -> str:
    if len(price_pivots) < 2 or len(rsi_pivots) < 2:
        return "none"
    if side == "LONG":
        price_recent, price_prev = price_pivots[-1], price_pivots[-2]
        rsi_recent, rsi_prev = rsi_pivots[-1], rsi_pivots[-2]
        if price_recent[1] > price_prev[1] and rsi_recent[1] < rsi_prev[1]:
            return "bullish_hidden"
    else:
        price_recent, price_prev = price_pivots[-1], price_pivots[-2]
        rsi_recent, rsi_prev = rsi_pivots[-1], rsi_pivots[-2]
        if price_recent[1] < price_prev[1] and rsi_recent[1] > rsi_prev[1]:
            return "bearish_hidden"
    return "none"


def detect_hl_lh_scanner(symbol: str, klines: list, closes: list[float], highs: list[float], lows: list[float], rsi: list[float | None]) -> list[dict]:
    if len(closes) < 220:
        return []

    price_highs, price_lows = find_pivots(closes, window=2)
    rsi_clean = [float(x) if x is not None else float('nan') for x in rsi]
    rsi_highs, rsi_lows = find_pivots([x for x in rsi_clean], window=2)
    ema20 = ema(closes, 20)
    ema50 = ema(closes, 50)
    trend_info = detect_trend(closes, highs, lows)
    results = []

    if len(price_highs) >= 2 and len(price_lows) >= 2:
        if trend_info.get("trend") == "uptrend":
            last_hh = price_highs[-1]
            prev_hh = price_highs[-2]
            last_hl = price_lows[-1]
            prev_hl = price_lows[-2]
            uptrend = last_hh[1] > prev_hh[1] and last_hl[1] > prev_hl[1]
            if uptrend:
                pullback_active = closes[-1] <= last_hh[1] and closes[-1] >= last_hl[1]
                reaction = closes[-1] > closes[-2]
                state = "forming" if pullback_active and reaction else "watch" if pullback_active else None
                if state:
                    divergence = find_rsi_divergence(rsi, price_lows, rsi_lows, "LONG")
                    results.append({
                        "symbol": symbol,
                        "side": "LONG",
                        "formationType": "HL",
                        "trendStatus": "UPTREND",
                        "state": state,
                        "majorLevel": round(prev_hl[1], 6),
                        "currentLevel": round(last_hl[1], 6),
                        "reaction": "close_up" if reaction else "none",
                        "emaZone": "above_ema20" if closes[-1] >= ema20[-1] else "above_ema50" if closes[-1] >= ema50[-1] else "below_ema50",
                        "rsiDivergence": divergence,
                        "price": fetch_hyper_price(symbol),
                        "detectedAt": datetime.fromtimestamp(int(klines[-1][0]) / 1000, tz=timezone.utc).isoformat(),
                    })

        elif trend_info.get("trend") == "downtrend":
            last_lh = price_highs[-1]
            prev_lh = price_highs[-2]
            last_ll = price_lows[-1]
            prev_ll = price_lows[-2]
            downtrend = last_lh[1] < prev_lh[1] and last_ll[1] < prev_ll[1]
            if downtrend:
                pullback_active = closes[-1] >= last_ll[1] and closes[-1] <= last_lh[1]
                reaction = closes[-1] < closes[-2]
                state = "forming" if pullback_active and reaction else "watch" if pullback_active else None
                if state:
                    divergence = find_rsi_divergence(rsi, price_highs, rsi_highs, "SHORT")
                    results.append({
                        "symbol": symbol,
                        "side": "SHORT",
                        "formationType": "LH",
                        "trendStatus": "DOWNTREND",
                        "state": state,
                        "majorLevel": round(prev_lh[1], 6),
                        "currentLevel": round(last_lh[1], 6),
                        "reaction": "close_down" if reaction else "none",
                        "emaZone": "below_ema20" if closes[-1] <= ema20[-1] else "below_ema50" if closes[-1] <= ema50[-1] else "above_ema50",
                        "rsiDivergence": divergence,
                        "price": fetch_hyper_price(symbol),
                        "detectedAt": datetime.fromtimestamp(int(klines[-1][0]) / 1000, tz=timezone.utc).isoformat(),
                    })

    return results


def main():
    layer = RAICryptoSignalOutputLayerV3(symbols=SYMBOLS)
    interest_rows = []
    formation_rows = []
    trend_rows = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for symbol in SYMBOLS:
        try:
            klines = layer.fetch_binance_klines(symbol=symbol, interval="4h", limit=300)
            _, highs, lows, closes = layer.extract_ohlc(klines)
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
                anchor = find_prior_rsi_anchor(rsi, klines, zone)
                interest_rows.append({
                    "symbol": symbol,
                    "rsi": round(float(last_rsi), 2),
                    "price": price,
                    "zone": zone,
                    "detectedAt": detected_at,
                    "anchorRsi": anchor["anchorRsi"],
                    "anchorTime": anchor["anchorTime"],
                    "timeframe": "4h",
                    "sourceVenue": "hyper",
                })

            formation_rows.extend(detect_hl_lh_scanner(symbol, klines, closes, highs, lows, rsi))

            trend_info = detect_trend(closes, highs, lows)
            trend_rows.append({
                "symbol": symbol,
                "trend": trend_info["trend"],
                "strength": trend_info["strength"],
                "score": trend_info["score"],
                "trendSignal": trend_info["trendSignal"],
                "lastHigherHigh": trend_info["lastHigherHigh"],
                "lastHigherLow": trend_info["lastHigherLow"],
                "lastLowerHigh": trend_info["lastLowerHigh"],
                "lastLowerLow": trend_info["lastLowerLow"],
                "emaAligned": trend_info["emaAligned"],
                "breakoutConfirmed": trend_info["breakoutConfirmed"],
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
                "score": 0,
                "trendSignal": "NONE",
                "lastHigherHigh": None,
                "lastHigherLow": None,
                "lastLowerHigh": None,
                "lastLowerLow": None,
                "emaAligned": False,
                "breakoutConfirmed": False,
                "price": None,
                "lastUpdate": updated_at,
                "timeframe": "4h",
                "sourceVenue": "hyper",
                "error": str(exc),
            })

    formation_rows.sort(key=lambda row: (0 if row["state"] == "forming" else 1, row["symbol"], row["side"]))
    next_scan_at = (datetime.fromisoformat(updated_at) + timedelta(minutes=30)).isoformat()

    payload = {
        "updatedAt": updated_at,
        "nextScanAt": next_scan_at,
        "interestRows": interest_rows,
        "formationRows": formation_rows,
        "trendRows": trend_rows,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
