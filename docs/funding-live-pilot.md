# Funding Reset Live Pilot

Scop: execuție live controlată pentru Strategia 2, fără auto-trading orb.

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

## Stare tehnică

- `hyperliquid-python-sdk` instalat
- `eth-account` instalat
- adapter Hyperliquid implementat în `scripts/funding_live_pilot.py`
- execuția reală rămâne blocată până la chei + confirmare explicită

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
   - `HYPERLIQUID_PRIVATE_KEY`
   - `HYPERLIQUID_ACCOUNT_ADDRESS`
5. candidat eligibil în snapshot

Comandă live armată:

```bash
RAI_LIVE_TRADING_ENABLED=YES \
HYPERLIQUID_PRIVATE_KEY=... \
HYPERLIQUID_ACCOUNT_ADDRESS=... \
python scripts/funding_live_pilot.py --exchange hyperliquid --symbol CHIP --execute --confirm CHIP
```

## Cum iei datele de pe telefon

1. Creează/folosește un wallet separat pentru pilot, nu walletul principal.
2. Depune în Hyperliquid doar buget pilot mic + buffer.
3. De pe telefon ai nevoie de:
   - adresa publică a contului Hyperliquid / walletului: poate fi trimisă aici;
   - private key/API wallet key: NU se trimite în chat. Se pune local pe PC în environment.
4. Dacă Hyperliquid permite agent/API wallet, folosește agent wallet dedicat tradingului.

## Ticket curent CHIP

- Side: LONG
- Entry/Price: 0.03967
- SL: 0.02993107
- TP1: 0.05427839
- Runner: 0.06401732
- Margin: $50
- Leverage: 3x
- Notional: $150
- Size Hyperliquid calculat: ~3781 CHIP

## Comportament ordine

- `--order-type limit`:
  - trimite limit GTC entry;
  - bracket plan este salvat, iar SL/TP se pun după fill.
- `--order-type market`:
  - deschide market;
  - încearcă să pună imediat reduce-only SL full size, TP1 half size, Runner half size.

## Notă de siguranță

Dashboard-ul și chat-ul nu plasează ordine direct. Totul trece prin `scripts/funding_live_pilot.py`, cu guard-uri. Nu salva chei în repo.