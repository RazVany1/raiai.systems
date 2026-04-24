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


def find_fractal_pivots(values: list[float], window: int = 2) -> tuple[list[tuple[int, float]], list[tuple[int, float]]]:
    return find_pivots(values, window=window)


def fib_level(high_value: float, low_value: float, ratio: float) -> float:
    return high_value - (high_value - low_value) * ratio


def average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def within_pct(a: float, b: float, pct: float = 0.008) -> bool:
    if b == 0:
        return False
    return abs(a - b) / abs(b) <= pct


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


def opensafe(high: float, low: float, previous_close: float) -> float:
    return max(previous_close, low + ((high - low) * 0.7))


def closesafe(low: float, high: float, previous_close: float) -> float:
    return min(previous_close, high - ((high - low) * 0.7))


def build_entry_result(symbol: str, side: str, zone_tier: str, trigger_name: str, trend_strength: str, entry_timing: str, structure_intact: bool, supportive_participation: bool, score: int, decision: str, price: float | None, detected_at: str) -> dict:
    return {
        "symbol": symbol,
        "side": side,
        "trendStatus": "UPTREND" if side == "LONG" else "DOWNTREND",
        "zoneTier": zone_tier,
        "entryTrigger": trigger_name,
        "trendStrength": trend_strength,
        "entryTiming": entry_timing,
        "structureIntegrity": "valid" if structure_intact else "broken",
        "volumeConfirmation": "supportive" if supportive_participation else "weak",
        "score": score,
        "tradeDecision": decision,
        "price": price,
        "detectedAt": detected_at,
    }


def detect_long_entry_point(layer: RAICryptoSignalOutputLayerV3, symbol: str, klines_4h: list, closes_4h: list[float], highs_4h: list[float], lows_4h: list[float], volumes_4h: list[float]) -> dict | None:
    if len(closes_4h) < 220:
        return None

    daily_klines = layer.fetch_binance_klines(symbol=symbol, interval="1d", limit=260)
    _, _, _, daily_closes = layer.extract_ohlc(daily_klines)
    daily_ema50 = ema(daily_closes, 50)
    daily_ema200 = ema(daily_closes, 200)
    ema20_4h = ema(closes_4h, 20)
    ema50_4h = ema(closes_4h, 50)
    ema200_4h = ema(closes_4h, 200)

    daily_alignment = daily_closes[-1] > daily_ema50[-1] and daily_ema50[-1] > daily_ema200[-1]
    h4_alignment = closes_4h[-1] > ema50_4h[-1] and ema50_4h[-1] > ema200_4h[-1]
    ema_stack_bullish = ema20_4h[-1] > ema50_4h[-1] > ema200_4h[-1]

    fractal_highs, fractal_lows = find_fractal_pivots(closes_4h, window=2)
    if len(fractal_highs) < 2 or len(fractal_lows) < 2:
        return None

    last_swing_high = fractal_highs[-1]
    prev_swing_high = fractal_highs[-2]
    last_swing_low = fractal_lows[-1]
    prev_swing_low = fractal_lows[-2]
    structure_valid = last_swing_high[1] > prev_swing_high[1] and last_swing_low[1] > prev_swing_low[1]
    structure_intact = closes_4h[-1] > last_swing_low[1]

    if not (daily_alignment and h4_alignment and structure_valid and structure_intact and ema_stack_bullish):
        return None

    breakout_level = prev_swing_high[1]
    last_hl = last_swing_low[1]
    current_price = closes_4h[-1]

    fib_382 = fib_level(last_swing_high[1], last_swing_low[1], 0.382)
    fib_50 = fib_level(last_swing_high[1], last_swing_low[1], 0.5)
    fib_618 = fib_level(last_swing_high[1], last_swing_low[1], 0.618)

    zone_tier = None
    tier1 = within_pct(current_price, breakout_level, 0.012) and current_price > last_hl
    if tier1:
        zone_tier = "TIER 1"
    tier2 = (min(ema20_4h[-1], ema50_4h[-1]) <= current_price <= max(ema20_4h[-1], ema50_4h[-1]))
    if zone_tier is None and tier2:
        zone_tier = "TIER 2"
    liquidity_sweep = len(lows_4h) >= 4 and lows_4h[-2] < min(lows_4h[-4:-1]) and closes_4h[-1] > min(lows_4h[-4:-1])
    if zone_tier in {"TIER 1", "TIER 2"} and liquidity_sweep:
        zone_tier = "TIER 3"
    trendline_candidate = last_swing_low[1] + ((last_swing_high[1] - last_swing_low[1]) * 0.5)
    if zone_tier is None and within_pct(current_price, trendline_candidate, 0.01):
        if within_pct(current_price, ema20_4h[-1], 0.01) or within_pct(current_price, breakout_level, 0.012) or within_pct(current_price, last_hl, 0.012):
            zone_tier = "TIER 4"
    if zone_tier is None and (within_pct(current_price, fib_618, 0.012) or within_pct(current_price, ema200_4h[-1], 0.012)) and structure_intact:
        zone_tier = "TIER 5"
    if zone_tier is None:
        return None

    bullish_rejection = closes_4h[-1] > lows_4h[-1] + ((highs_4h[-1] - lows_4h[-1]) * 0.6)
    close_above_prev_high = closes_4h[-1] > highs_4h[-2]
    impulsive_reclaim = closes_4h[-1] > opensafe(highs_4h[-1], lows_4h[-1], closes_4h[-2])
    trigger_detected = bullish_rejection or close_above_prev_high or liquidity_sweep or impulsive_reclaim
    trigger_name = "bullish_rejection" if bullish_rejection else "close_above_prev_high" if close_above_prev_high else "liquidity_sweep_reclaim" if liquidity_sweep else "impulsive_reclaim" if impulsive_reclaim else "none"

    pullback_volume = average(volumes_4h[-4:-1])
    impulse_volume = average(volumes_4h[-9:-5])
    reclaim_volume = volumes_4h[-1] if volumes_4h else 0
    supportive_participation = pullback_volume < impulse_volume and reclaim_volume > pullback_volume

    extensions_above_ema = sum(1 for close in closes_4h[-12:] if close > ema20_4h[-1] * 1.03)
    repeated_high_retests = sum(1 for high in highs_4h[-10:] if within_pct(high, last_swing_high[1], 0.006))
    deepening_retracements = min(lows_4h[-8:]) < min(lows_4h[-16:-8]) if len(lows_4h) >= 16 else False
    if last_swing_low[0] > last_swing_high[0] - 8:
        entry_timing = "EARLY TREND"
    elif extensions_above_ema >= 4 or repeated_high_retests >= 3 or deepening_retracements:
        entry_timing = "LATE TREND"
    else:
        entry_timing = "MID TREND"

    daily_slope_up = daily_ema50[-1] > daily_ema50[-5] and daily_ema200[-1] >= daily_ema200[-5]
    h4_slopes_up = ema20_4h[-1] > ema20_4h[-5] and ema50_4h[-1] > ema50_4h[-5] and ema200_4h[-1] >= ema200_4h[-5]
    shallow_pullbacks = min(lows_4h[-8:]) >= ema50_4h[-1]
    price_crosses = sum(1 for close in closes_4h[-12:] if close < ema20_4h[-1] or close < ema50_4h[-1])
    flattening = abs(ema20_4h[-1] - ema20_4h[-5]) / ema20_4h[-1] < 0.002
    if daily_alignment and h4_alignment and ema_stack_bullish and daily_slope_up and h4_slopes_up and shallow_pullbacks:
        trend_strength = "STRONG TREND"
    elif price_crosses >= 4 or flattening:
        trend_strength = "WEAK TREND"
    else:
        trend_strength = "NORMAL TREND"

    score = 0
    if daily_alignment:
        score += 2
    if h4_alignment:
        score += 2
    if structure_valid and structure_intact:
        score += 2
    if zone_tier in {"TIER 1", "TIER 2"}:
        score += 2
    elif zone_tier in {"TIER 3", "TIER 4", "TIER 5"}:
        score += 1
    if trigger_detected:
        score += 1
    if supportive_participation:
        score += 1
    if entry_timing == "LATE TREND":
        score = max(0, score - 1)
    if trend_strength == "WEAK TREND" and zone_tier != "TIER 1":
        score = min(score, 7)

    invalid = closes_4h[-1] < last_hl or not daily_alignment or (current_price < fib_618 and current_price < ema50_4h[-1])
    decision = "EXECUTE" if score >= 8 and not invalid else "REJECT"

    return build_entry_result(symbol, "LONG", zone_tier, trigger_name if trigger_detected else "none", trend_strength, entry_timing, structure_intact, supportive_participation, score, decision, fetch_hyper_price(symbol), datetime.fromtimestamp(int(klines_4h[-1][0]) / 1000, tz=timezone.utc).isoformat())


def detect_short_entry_point(layer: RAICryptoSignalOutputLayerV3, symbol: str, klines_4h: list, closes_4h: list[float], highs_4h: list[float], lows_4h: list[float], volumes_4h: list[float]) -> dict | None:
    if len(closes_4h) < 220:
        return None

    daily_klines = layer.fetch_binance_klines(symbol=symbol, interval="1d", limit=260)
    _, _, _, daily_closes = layer.extract_ohlc(daily_klines)
    daily_ema50 = ema(daily_closes, 50)
    daily_ema200 = ema(daily_closes, 200)
    ema20_4h = ema(closes_4h, 20)
    ema50_4h = ema(closes_4h, 50)
    ema200_4h = ema(closes_4h, 200)

    daily_alignment = daily_closes[-1] < daily_ema50[-1] and daily_ema50[-1] < daily_ema200[-1]
    h4_alignment = closes_4h[-1] < ema50_4h[-1] and ema50_4h[-1] < ema200_4h[-1]
    ema_stack_bearish = ema20_4h[-1] < ema50_4h[-1] < ema200_4h[-1]

    fractal_highs, fractal_lows = find_fractal_pivots(closes_4h, window=2)
    if len(fractal_highs) < 2 or len(fractal_lows) < 2:
        return None

    last_swing_high = fractal_highs[-1]
    prev_swing_high = fractal_highs[-2]
    last_swing_low = fractal_lows[-1]
    prev_swing_low = fractal_lows[-2]
    structure_valid = last_swing_high[1] < prev_swing_high[1] and last_swing_low[1] < prev_swing_low[1]
    structure_intact = closes_4h[-1] < last_swing_high[1]

    if not (daily_alignment and h4_alignment and structure_valid and structure_intact and ema_stack_bearish):
        return None

    breakout_level = prev_swing_low[1]
    last_lh = last_swing_high[1]
    current_price = closes_4h[-1]

    fib_382 = fib_level(last_swing_low[1], last_swing_high[1], 0.382)
    fib_50 = fib_level(last_swing_low[1], last_swing_high[1], 0.5)
    fib_618 = fib_level(last_swing_low[1], last_swing_high[1], 0.618)

    zone_tier = None
    tier1 = within_pct(current_price, breakout_level, 0.012) and current_price < last_lh
    if tier1:
        zone_tier = "TIER 1"
    tier2 = (min(ema20_4h[-1], ema50_4h[-1]) <= current_price <= max(ema20_4h[-1], ema50_4h[-1]))
    if zone_tier is None and tier2:
        zone_tier = "TIER 2"
    liquidity_sweep = len(highs_4h) >= 4 and highs_4h[-2] > max(highs_4h[-4:-1]) and closes_4h[-1] < max(highs_4h[-4:-1])
    if zone_tier in {"TIER 1", "TIER 2"} and liquidity_sweep:
        zone_tier = "TIER 3"
    trendline_candidate = last_swing_high[1] - ((last_swing_high[1] - last_swing_low[1]) * 0.5)
    if zone_tier is None and within_pct(current_price, trendline_candidate, 0.01):
        if within_pct(current_price, ema20_4h[-1], 0.01) or within_pct(current_price, breakout_level, 0.012) or within_pct(current_price, last_lh, 0.012):
            zone_tier = "TIER 4"
    if zone_tier is None and (within_pct(current_price, fib_618, 0.012) or within_pct(current_price, ema200_4h[-1], 0.012)) and structure_intact:
        zone_tier = "TIER 5"
    if zone_tier is None:
        return None

    bearish_rejection = closes_4h[-1] < highs_4h[-1] - ((highs_4h[-1] - lows_4h[-1]) * 0.6)
    close_below_prev_low = closes_4h[-1] < lows_4h[-2]
    impulsive_reclaim = closes_4h[-1] < closesafe(lows_4h[-1], highs_4h[-1], closes_4h[-2])
    trigger_detected = bearish_rejection or close_below_prev_low or liquidity_sweep or impulsive_reclaim
    trigger_name = "bearish_rejection" if bearish_rejection else "close_below_prev_low" if close_below_prev_low else "liquidity_sweep_reclaim" if liquidity_sweep else "impulsive_reclaim" if impulsive_reclaim else "none"

    pullback_volume = average(volumes_4h[-4:-1])
    impulse_volume = average(volumes_4h[-9:-5])
    reclaim_volume = volumes_4h[-1] if volumes_4h else 0
    supportive_participation = pullback_volume < impulse_volume and reclaim_volume > pullback_volume

    extensions_below_ema = sum(1 for close in closes_4h[-12:] if close < ema20_4h[-1] * 0.97)
    repeated_low_retests = sum(1 for low in lows_4h[-10:] if within_pct(low, last_swing_low[1], 0.006))
    deepening_retracements = max(highs_4h[-8:]) > max(highs_4h[-16:-8]) if len(highs_4h) >= 16 else False
    if last_swing_high[0] > last_swing_low[0] - 8:
        entry_timing = "EARLY TREND"
    elif extensions_below_ema >= 4 or repeated_low_retests >= 3 or deepening_retracements:
        entry_timing = "LATE TREND"
    else:
        entry_timing = "MID TREND"

    daily_slope_down = daily_ema50[-1] < daily_ema50[-5] and daily_ema200[-1] <= daily_ema200[-5]
    h4_slopes_down = ema20_4h[-1] < ema20_4h[-5] and ema50_4h[-1] < ema50_4h[-5] and ema200_4h[-1] <= ema200_4h[-5]
    shallow_pullbacks = max(highs_4h[-8:]) <= ema50_4h[-1]
    price_crosses = sum(1 for close in closes_4h[-12:] if close > ema20_4h[-1] or close > ema50_4h[-1])
    flattening = abs(ema20_4h[-1] - ema20_4h[-5]) / max(abs(ema20_4h[-1]), 1e-9) < 0.002
    if daily_alignment and h4_alignment and ema_stack_bearish and daily_slope_down and h4_slopes_down and shallow_pullbacks:
        trend_strength = "STRONG TREND"
    elif price_crosses >= 4 or flattening:
        trend_strength = "WEAK TREND"
    else:
        trend_strength = "NORMAL TREND"

    score = 0
    if daily_alignment:
        score += 2
    if h4_alignment:
        score += 2
    if structure_valid and structure_intact:
        score += 2
    if zone_tier in {"TIER 1", "TIER 2"}:
        score += 2
    elif zone_tier in {"TIER 3", "TIER 4", "TIER 5"}:
        score += 1
    if trigger_detected:
        score += 1
    if supportive_participation:
        score += 1
    if entry_timing == "LATE TREND":
        score = max(0, score - 1)
    if trend_strength == "WEAK TREND" and zone_tier != "TIER 1":
        score = min(score, 7)

    invalid = closes_4h[-1] > last_lh or not daily_alignment or (current_price > fib_618 and current_price > ema50_4h[-1])
    decision = "EXECUTE" if score >= 8 and not invalid else "REJECT"

    return build_entry_result(symbol, "SHORT", zone_tier, trigger_name if trigger_detected else "none", trend_strength, entry_timing, structure_intact, supportive_participation, score, decision, fetch_hyper_price(symbol), datetime.fromtimestamp(int(klines_4h[-1][0]) / 1000, tz=timezone.utc).isoformat())


def main():
    layer = RAICryptoSignalOutputLayerV3(symbols=SYMBOLS)
    interest_rows = []
    entry_rows = []
    trend_rows = []
    updated_at = datetime.now(timezone.utc).isoformat()

    for symbol in SYMBOLS:
        try:
            klines = layer.fetch_binance_klines(symbol=symbol, interval="4h", limit=300)
            _, highs, lows, closes = layer.extract_ohlc(klines)
            volumes = [float(k[5]) for k in klines]
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

            long_entry = detect_long_entry_point(layer, symbol, klines, closes, highs, lows, volumes)
            if long_entry:
                entry_rows.append(long_entry)
            short_entry = detect_short_entry_point(layer, symbol, klines, closes, highs, lows, volumes)
            if short_entry:
                entry_rows.append(short_entry)

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

    entry_rows.sort(key=lambda row: (-row["score"], row["symbol"], row["side"]))
    next_scan_at = (datetime.fromisoformat(updated_at) + timedelta(minutes=30)).isoformat()

    payload = {
        "updatedAt": updated_at,
        "nextScanAt": next_scan_at,
        "interestRows": interest_rows,
        "entryRows": entry_rows,
        "trendRows": trend_rows,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
