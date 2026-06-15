# Funding Reset Live Pilot

Scop: pregătește execuția live controlată pentru Strategia 2, fără auto-trading orb.

## Reguli pilot

- Exchange preferat: Hyperliquid
- Strategie: Funding Reset Reclaim
- Doar Grade A
- Score minim: 85
- Margin/trade: $50
- Leverage: 3x
- Notional/trade: $150
- Max live simultan: 3 poziții
- SL, TP1 și Runner obligatorii

## Comandă dry-run

```bash
python scripts/funding_live_pilot.py --exchange hyperliquid --symbol CHIP
```

Output:
- `public/data/funding-live-pilot-tickets.json`
- `public/data/funding-live-pilot-status.json`

## Guard-uri pentru live execution

Execuția reală este blocată până când există toate simultan:

1. `--execute`
2. `--confirm SYMBOL`
3. `RAI_LIVE_TRADING_ENABLED=YES`
4. credențiale exchange în environment:
   - Hyperliquid: `HYPERLIQUID_PRIVATE_KEY`, `HYPERLIQUID_ACCOUNT_ADDRESS`
   - AsterDex: `ASTERDEX_API_KEY`, `ASTERDEX_API_SECRET`
5. adapterul exchange validat explicit pe test mic

Exemplu de comandă armată, încă blocată până la adapter validat:

```bash
RAI_LIVE_TRADING_ENABLED=YES \
HYPERLIQUID_PRIVATE_KEY=... \
HYPERLIQUID_ACCOUNT_ADDRESS=... \
python scripts/funding_live_pilot.py --exchange hyperliquid --symbol CHIP --execute --confirm CHIP
```

## Ticket curent CHIP

- Side: LONG
- Entry/Price: 0.03967
- SL: 0.02993107
- TP1: 0.05427839
- Runner: 0.06401732
- Margin: $50
- Leverage: 3x
- Notional: $150

## Notă de siguranță

Scriptul nu va trimite ordine reale fără adapter/chei/confirmare. Dashboard-ul și chat-ul nu trebuie să plaseze ordine direct; totul trece prin acest script.
