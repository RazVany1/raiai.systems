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
    "OPUSDT", "ATOMUSDT", "FILUSDT", "INJUSDT", "SEIUSDT", "TIAUSDT", "ONDOUSDT", "DYDXUSDT", "PENDLEUSDT", "ETCUSDT",
]

OUTPUT_PATH = Path(r"C:\Users\R\raiai.systems\public\data\rsi-trend-dashboard.json")
FORMATION_STATE_PATH = Path(r"C:\Users\R\raiai.systems\public\data\hl-lh-formation-state.json")
PAPER_POSITIONS_PATH = Path(r"C:\Users\R\raiai.systems\public\data\paper-entry-positions.json")
PAPER_POSITIONS_HISTORY_PATH = Path(r"C:\Users\R\raiai.systems\public\data\paper-entry-positions-history.json")


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


def adx(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> list[float | None]:
    if len(closes) < period + 1:
        return [None] * len(closes)

    tr_list: list[float] = [0.0]
    plus_dm: list[float] = [0.0]
    minus_dm: list[float] = [0.0]

    for i in range(1, len(closes)):
        high_diff = highs[i] - highs[i - 1]
        low_diff = lows[i - 1] - lows[i]
        plus_dm.append(high_diff if high_diff > low_diff and high_diff > 0 else 0.0)
        minus_dm.append(low_diff if low_diff > high_diff and low_diff > 0 else 0.0)
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        tr_list.append(tr)

    adx_values: list[float | None] = [None] * len(closes)
    tr14 = sum(tr_list[1:period + 1])
    plus14 = sum(plus_dm[1:period + 1])
    minus14 = sum(minus_dm[1:period + 1])

    dx_values: list[float | None] = [None] * len(closes)
    for i in range(period, len(closes)):
        if i > period:
            tr14 = tr14 - (tr14 / period) + tr_list[i]
            plus14 = plus14 - (plus14 / period) + plus_dm[i]
            minus14 = minus14 - (minus14 / period) + minus_dm[i]

        plus_di = 0.0 if tr14 == 0 else 100.0 * (plus14 / tr14)
        minus_di = 0.0 if tr14 == 0 else 100.0 * (minus14 / tr14)
        di_sum = plus_di + minus_di
        dx_values[i] = 0.0 if di_sum == 0 else 100.0 * abs(plus_di - minus_di) / di_sum

    valid_dx = [x for x in dx_values[period:] if x is not None]
    if len(valid_dx) < period:
        return adx_values

    first_adx_index = period * 2 - 1
    first_adx = sum(valid_dx[:period]) / period
    if first_adx_index < len(adx_values):
        adx_values[first_adx_index] = first_adx

    prev_adx = first_adx
    for i in range(first_adx_index + 1, len(closes)):
        dx = dx_values[i]
        if dx is None:
            continue
        prev_adx = ((prev_adx * (period - 1)) + dx) / period
        adx_values[i] = prev_adx

    return adx_values


def repeated_ema50_crosses(closes: list[float], ema50_values: list[float], lookback: int = 12) -> bool:
    start = max(1, len(closes) - lookback)
    crosses = 0
    for i in range(start, len(closes)):
        prev_above = closes[i - 1] >= ema50_values[i - 1]
        curr_above = closes[i] >= ema50_values[i]
        if prev_above != curr_above:
            crosses += 1
    return crosses >= 3


def slope_up(values: list[float], lookback: int = 3) -> bool:
    if len(values) <= lookback:
        return False
    return values[-1] > values[-1 - lookback]


def slope_down(values: list[float], lookback: int = 3) -> bool:
    if len(values) <= lookback:
        return False
    return values[-1] < values[-1 - lookback]


def classify_adx_strength(adx_value: float | None) -> str:
    if adx_value is None:
        return "unknown"
    if adx_value < 20:
        return "no trend"
    if adx_value <= 25:
        return "weak trend"
    if adx_value <= 40:
        return "valid trend"
    return "strong trend"


def compute_pl_percent(entry_price: float | None, current_price: float | None, side: str | None) -> float | None:
    if entry_price is None or current_price is None:
        return None
    if not isinstance(entry_price, (int, float)) or not isinstance(current_price, (int, float)):
        return None
    if entry_price == 0:
        return None
    if side == "SHORT":
        return ((entry_price - current_price) / entry_price) * 100.0
    return ((current_price - entry_price) / entry_price) * 100.0


def detect_market_direction(symbol: str, layer: RAICryptoSignalOutputLayerV3) -> dict:
    klines_4h = layer.fetch_binance_klines(symbol=symbol, interval="4h", limit=300)
    _, highs_4h, lows_4h, closes_4h = layer.extract_ohlc(klines_4h)
    klines_1d = layer.fetch_binance_klines(symbol=symbol, interval="1d", limit=300)
    _, highs_1d, lows_1d, closes_1d = layer.extract_ohlc(klines_1d)

    ema20_4h = ema(closes_4h, 20)
    ema50_4h = ema(closes_4h, 50)
    ema200_4h = ema(closes_4h, 200)
    ema50_1d = ema(closes_1d, 50)
    ema200_1d = ema(closes_1d, 200)
    adx_values = adx(highs_4h, lows_4h, closes_4h, 14)
    last_adx = adx_values[-1]

    daily_bias = "neutral"
    if closes_1d[-1] > ema50_1d[-1] and ema50_1d[-1] > ema200_1d[-1]:
        daily_bias = "bullish"
    elif closes_1d[-1] < ema50_1d[-1] and ema50_1d[-1] < ema200_1d[-1]:
        daily_bias = "bearish"

    bullish_stack = closes_4h[-1] > 0 and ema20_4h[-1] > ema50_4h[-1] > ema200_4h[-1] and slope_up(ema20_4h) and slope_up(ema50_4h) and slope_up(ema200_4h)
    bearish_stack = closes_4h[-1] > 0 and ema20_4h[-1] < ema50_4h[-1] < ema200_4h[-1] and slope_down(ema20_4h) and slope_down(ema50_4h) and slope_down(ema200_4h)
    ema_direction = "bullish" if bullish_stack else "bearish" if bearish_stack else "neutral"

    swing_highs, swing_lows = find_pivots(closes_4h, window=2)
    fractal_highs, fractal_lows = find_pivots(closes_4h, window=5)
    use_highs = fractal_highs if len(fractal_highs) >= 2 else swing_highs
    use_lows = fractal_lows if len(fractal_lows) >= 2 else swing_lows

    bullish_structure = len(use_highs) >= 2 and len(use_lows) >= 2 and use_highs[-1][1] > use_highs[-2][1] and use_lows[-1][1] > use_lows[-2][1]
    bearish_structure = len(use_highs) >= 2 and len(use_lows) >= 2 and use_highs[-1][1] < use_highs[-2][1] and use_lows[-1][1] < use_lows[-2][1]
    market_structure = "bullish HH/HL" if bullish_structure else "bearish LH/LL" if bearish_structure else "sideways/mixed"

    bullish_score = 0
    bearish_score = 0

    if daily_bias == "bullish":
        bullish_score += 2
    if daily_bias == "bearish":
        bearish_score += 2
    if bullish_stack:
        bullish_score += 2
    if bearish_stack:
        bearish_score += 2
    if bullish_structure:
        bullish_score += 2
    if bearish_structure:
        bearish_score += 2
    if closes_4h[-1] > ema200_4h[-1]:
        bullish_score += 1
    if closes_4h[-1] < ema200_4h[-1]:
        bearish_score += 1
    if last_adx is not None and last_adx > 25:
        bullish_score += 1
        bearish_score += 1
    if slope_up(ema20_4h):
        bullish_score += 1
    if slope_down(ema20_4h):
        bearish_score += 1
    if slope_up(ema50_4h):
        bullish_score += 1
    if slope_down(ema50_4h):
        bearish_score += 1

    final_direction = "UNCLEAR"
    if last_adx is not None and last_adx < 20 and repeated_ema50_crosses(closes_4h, ema50_4h):
        final_direction = "SIDEWAYS"
    elif bullish_score >= 8 and bullish_score > bearish_score:
        final_direction = "STRONG BULLISH"
    elif 6 <= bullish_score <= 7 and bullish_score > bearish_score:
        final_direction = "MODERATE BULLISH"
    elif bearish_score >= 8 and bearish_score > bullish_score:
        final_direction = "STRONG BEARISH"
    elif 6 <= bearish_score <= 7 and bearish_score > bullish_score:
        final_direction = "MODERATE BEARISH"

    invalidation_level = None
    if final_direction in {"STRONG BULLISH", "MODERATE BULLISH"}:
        invalidation_level = round(use_lows[-1][1], 6) if use_lows else round(ema50_1d[-1], 6)
    elif final_direction in {"STRONG BEARISH", "MODERATE BEARISH"}:
        invalidation_level = round(use_highs[-1][1], 6) if use_highs else round(ema50_1d[-1], 6)

    trade_permission = "NO TRADE"
    if final_direction in {"STRONG BULLISH", "MODERATE BULLISH"}:
        trade_permission = "LONG ONLY"
    elif final_direction in {"STRONG BEARISH", "MODERATE BEARISH"}:
        trade_permission = "SHORT ONLY"

    return {
        "symbol": symbol,
        "timeframe": "4h",
        "dailyBias": daily_bias,
        "emaDirection4h": ema_direction,
        "marketStructure": market_structure,
        "adxTrendStrength": classify_adx_strength(last_adx),
        "adxValue": round(last_adx, 2) if last_adx is not None else None,
        "bullishScore": bullish_score,
        "bearishScore": bearish_score,
        "finalMarketDirection": final_direction,
        "invalidationLevel": invalidation_level,
        "tradePermission": trade_permission,
        "price": fetch_hyper_price(symbol),
        "lastUpdate": datetime.fromtimestamp(int(klines_4h[-1][0]) / 1000, tz=timezone.utc).isoformat(),
        "sourceVenue": "hyper",
        "dailyClose": closes_1d[-1],
        "dailyEma50": round(ema50_1d[-1], 6),
        "dailyEma200": round(ema200_1d[-1], 6),
    }


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
                confirmed = reaction and closes[-1] > highs[-2]
                late = closes[-1] > last_hh[1] * 0.985
                invalidated = closes[-1] < prev_hl[1]
                state = "invalidated" if invalidated else "late" if late else "confirmed" if confirmed else "forming" if pullback_active and reaction else "watch" if pullback_active else None
                if state:
                    divergence = find_rsi_divergence(rsi, price_lows, rsi_lows, "LONG")
                    event_index = len(klines) - 1 if state in {"watch", "forming", "late", "invalidated"} else len(klines) - 1
                    if state == "confirmed":
                        event_index = len(klines) - 1
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
                        "eventAt": datetime.fromtimestamp(int(klines[event_index][0]) / 1000, tz=timezone.utc).isoformat(),
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
                confirmed = reaction and closes[-1] < lows[-2]
                late = closes[-1] < last_ll[1] * 1.015
                invalidated = closes[-1] > prev_lh[1]
                state = "invalidated" if invalidated else "late" if late else "confirmed" if confirmed else "forming" if pullback_active and reaction else "watch" if pullback_active else None
                if state:
                    divergence = find_rsi_divergence(rsi, price_highs, rsi_highs, "SHORT")
                    event_index = len(klines) - 1 if state in {"watch", "forming", "late", "invalidated"} else len(klines) - 1
                    if state == "confirmed":
                        event_index = len(klines) - 1
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
                        "eventAt": datetime.fromtimestamp(int(klines[event_index][0]) / 1000, tz=timezone.utc).isoformat(),
                    })

    return results


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def main():
    layer = RAICryptoSignalOutputLayerV3(symbols=SYMBOLS)
    interest_rows = []
    formation_rows = []
    trend_rows = []
    updated_at = datetime.now(timezone.utc).isoformat()
    formation_state = load_json(FORMATION_STATE_PATH, {"confirmed": {}})
    confirmed_state = formation_state.get("confirmed", {}) if isinstance(formation_state.get("confirmed"), dict) else {}

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

            trend_rows.append(detect_market_direction(symbol, layer))
        except Exception as exc:
            trend_rows.append({
                "symbol": symbol,
                "symbol": symbol,
                "timeframe": "4h",
                "dailyBias": "error",
                "emaDirection4h": "error",
                "marketStructure": "error",
                "adxTrendStrength": "unknown",
                "adxValue": None,
                "bullishScore": 0,
                "bearishScore": 0,
                "finalMarketDirection": "UNCLEAR",
                "invalidationLevel": None,
                "tradePermission": "NO TRADE",
                "price": None,
                "lastUpdate": updated_at,
                "sourceVenue": "hyper",
                "error": str(exc),
            })

    now_dt = datetime.fromisoformat(updated_at)
    new_confirmed_state = {}
    formation_index = {(row["symbol"], row["side"]): row for row in formation_rows}

    for key, row in formation_index.items():
        if row["state"] == "confirmed":
            confirmed_at = confirmed_state.get(f"{row['symbol']}:{row['side']}", {}).get("confirmedAt", row.get("eventAt", updated_at))
            row["confirmedAt"] = confirmed_at
            new_confirmed_state[f"{row['symbol']}:{row['side']}"] = {
                "row": row,
                "confirmedAt": confirmed_at,
            }
        else:
            row["confirmedAt"] = None

    for state_key, saved in confirmed_state.items():
        saved_row = saved.get("row") if isinstance(saved, dict) else None
        confirmed_at = saved.get("confirmedAt") if isinstance(saved, dict) else None
        if not saved_row or not confirmed_at:
            continue
        confirmed_dt = datetime.fromisoformat(confirmed_at)
        if (now_dt - confirmed_dt) <= timedelta(hours=10):
            row_key = (saved_row.get("symbol"), saved_row.get("side"))
            if row_key not in formation_index:
                saved_row["state"] = "confirmed"
                saved_row["confirmedAt"] = confirmed_at
                formation_rows.append(saved_row)
            new_confirmed_state[state_key] = {
                "row": saved_row,
                "confirmedAt": confirmed_at,
            }

    formation_rows.sort(key=lambda row: (0 if row["state"] == "confirmed" else 1 if row["state"] == "forming" else 2, row["symbol"], row["side"]))

    existing_positions = load_json(PAPER_POSITIONS_PATH, {"positions": []})
    existing_by_pair = {}
    existing_by_entry = {}
    if isinstance(existing_positions, dict):
        for pos in existing_positions.get("positions", []):
            if isinstance(pos, dict):
                entry_key = (pos.get("symbol"), pos.get("side"), pos.get("entryAt"))
                pair_key = (pos.get("symbol"), pos.get("side"))
                existing_by_entry[entry_key] = pos
                existing_by_pair.setdefault(pair_key, []).append(pos)

    trend_map = {row["symbol"]: row for row in trend_rows if isinstance(row, dict)}
    formation_map = {(row.get("symbol"), row.get("side")): row for row in formation_rows if isinstance(row, dict)}
    paper_positions = []
    handled_entry_keys = set()

    for row in formation_rows:
        symbol = row.get("symbol")
        side = row.get("side")
        state = row.get("state")
        trend = trend_map.get(symbol)
        if not trend:
            continue
        allowed = (
            side == "LONG" and trend.get("finalMarketDirection") in {"STRONG BULLISH", "MODERATE BULLISH"} and trend.get("tradePermission") == "LONG ONLY"
        ) or (
            side == "SHORT" and trend.get("finalMarketDirection") in {"STRONG BEARISH", "MODERATE BEARISH"} and trend.get("tradePermission") == "SHORT ONLY"
        )
        if state not in {"forming", "confirmed"} or not allowed:
            continue

        pair_key = (symbol, side)
        entry_time = row.get("confirmedAt") if state == "confirmed" else row.get("detectedAt")
        entry_price = row.get("price")
        existing_candidates = existing_by_pair.get(pair_key, [])
        existing = None
        for candidate in existing_candidates:
            if candidate.get("closedAt") is None and candidate.get("status") != "closed_invalidated":
                existing = candidate
                break
        if existing is None and existing_candidates:
            existing = existing_candidates[0]

        if existing:
            handled_entry_keys.add((existing.get("symbol"), existing.get("side"), existing.get("entryAt")))
            closed_at = existing.get("closedAt")
            status = existing.get("status", "open")
            if not status.startswith("closed"):
                status = "open"
            current_pl = compute_pl_percent(existing.get("entryPrice"), entry_price, side)
            previous_max_pl = existing.get("maxPlPercent")
            previous_min_pl = existing.get("minPlPercent")
            max_pl = 0.0
            min_pl = 0.0
            if isinstance(previous_max_pl, (int, float)):
                max_pl = max(0.0, previous_max_pl)
            if isinstance(previous_min_pl, (int, float)):
                min_pl = min(0.0, previous_min_pl)
            if isinstance(current_pl, (int, float)):
                max_pl = max(max_pl, current_pl)
                min_pl = min(min_pl, current_pl)
            paper_positions.append({
                **existing,
                "lastSeenAt": updated_at,
                "currentPrice": entry_price,
                "trendDirection": trend.get("finalMarketDirection"),
                "tradePermission": trend.get("tradePermission"),
                "invalidationLevel": trend.get("invalidationLevel"),
                "entryState": existing.get("entryState", state),
                "status": status,
                "closedAt": closed_at,
                "maxPlPercent": max_pl,
                "minPlPercent": min_pl,
            })
        else:
            paper_positions.append({
                "symbol": symbol,
                "side": side,
                "entryPrice": entry_price,
                "entryAt": entry_time,
                "entryState": state,
                "trendDirection": trend.get("finalMarketDirection"),
                "tradePermission": trend.get("tradePermission"),
                "invalidationLevel": trend.get("invalidationLevel"),
                "formationType": row.get("formationType"),
                "detectedAt": row.get("detectedAt"),
                "lastSeenAt": updated_at,
                "currentPrice": entry_price,
                "status": "open",
                "closedAt": None,
                "maxPlPercent": 0.0,
                "minPlPercent": 0.0,
            })
            handled_entry_keys.add((symbol, side, entry_time))

    for key, existing in existing_by_entry.items():
        if key in handled_entry_keys:
            continue
        symbol, side, _entry_at = key
        trend = trend_map.get(symbol)
        formation = formation_map.get((symbol, side))
        current_price = trend.get("price") if trend else existing.get("currentPrice")
        invalidation_level = existing.get("invalidationLevel")
        if trend and trend.get("invalidationLevel") is not None:
            invalidation_level = trend.get("invalidationLevel")

        status = existing.get("status", "open")
        closed_at = existing.get("closedAt")

        invalidated = False
        if current_price is not None and invalidation_level is not None:
            if side == "LONG" and current_price <= invalidation_level:
                invalidated = True
            if side == "SHORT" and current_price >= invalidation_level:
                invalidated = True
        if formation and formation.get("state") == "invalidated":
            invalidated = True

        if invalidated:
            status = "closed_invalidated"
            closed_at = closed_at or updated_at
        elif formation and formation.get("state") in {"watch", "late"}:
            status = "weakened"
        elif formation and formation.get("state") in {"forming", "confirmed"}:
            status = "open"
        elif trend:
            status = "monitoring"

        current_pl = compute_pl_percent(existing.get("entryPrice"), current_price, side)
        previous_max_pl = existing.get("maxPlPercent")
        previous_min_pl = existing.get("minPlPercent")
        max_pl = 0.0
        min_pl = 0.0
        if isinstance(previous_max_pl, (int, float)):
            max_pl = max(0.0, previous_max_pl)
        if isinstance(previous_min_pl, (int, float)):
            min_pl = min(0.0, previous_min_pl)
        if isinstance(current_pl, (int, float)):
            max_pl = max(max_pl, current_pl)
            min_pl = min(min_pl, current_pl)

        paper_positions.append({
            **existing,
            "currentPrice": current_price,
            "lastSeenAt": updated_at,
            "trendDirection": trend.get("finalMarketDirection") if trend else existing.get("trendDirection"),
            "tradePermission": trend.get("tradePermission") if trend else existing.get("tradePermission"),
            "invalidationLevel": invalidation_level,
            "status": status,
            "closedAt": closed_at,
            "maxPlPercent": max_pl,
            "minPlPercent": min_pl,
        })
    status_order = {"open": 0, "weakened": 1, "monitoring": 2, "closed_invalidated": 3}
    paper_positions.sort(key=lambda row: (status_order.get(row.get("status", "monitoring"), 9), row.get("symbol", ""), row.get("entryAt", "")), reverse=False)

    history_data = load_json(PAPER_POSITIONS_HISTORY_PATH, {"positions": []})
    history_list = history_data.get("positions", []) if isinstance(history_data, dict) and isinstance(history_data.get("positions"), list) else []
    history_map = {}
    for pos in history_list:
        if isinstance(pos, dict):
            history_map[(pos.get("symbol"), pos.get("side"), pos.get("entryAt"))] = pos

    for pos in paper_positions:
        hist_key = (pos.get("symbol"), pos.get("side"), pos.get("entryAt"))
        previous = history_map.get(hist_key, {})
        history_map[hist_key] = {
            **previous,
            **pos,
            "firstSeenAt": previous.get("firstSeenAt", updated_at),
            "lastSeenAt": updated_at,
        }

    history_positions = sorted(
        history_map.values(),
        key=lambda row: (row.get("entryAt", ""), row.get("symbol", ""), row.get("side", "")),
        reverse=True,
    )

    next_scan_at = (datetime.fromisoformat(updated_at) + timedelta(minutes=15)).isoformat()

    payload = {
        "updatedAt": updated_at,
        "nextScanAt": next_scan_at,
        "openPaperPositions": paper_positions,
        "interestRows": interest_rows,
        "formationRows": formation_rows,
        "trendRows": trend_rows,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    FORMATION_STATE_PATH.write_text(json.dumps({"updatedAt": updated_at, "confirmed": new_confirmed_state}, indent=2, ensure_ascii=False), encoding="utf-8")
    PAPER_POSITIONS_PATH.write_text(json.dumps({"updatedAt": updated_at, "positions": paper_positions}, indent=2, ensure_ascii=False), encoding="utf-8")
    PAPER_POSITIONS_HISTORY_PATH.write_text(json.dumps({"updatedAt": updated_at, "positions": history_positions}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()

