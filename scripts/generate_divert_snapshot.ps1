$ErrorActionPreference = 'Stop'
Set-Location "C:\Users\R\raiai.systems"
python scripts\generate_divert_snapshot.py
python scripts\generate_divert_live_market.py
python scripts\sync_divert_trade_log_live.py
python scripts\manage_divert_closes.py
python scripts\sync_divert_position_tracker.py
python scripts\refresh_divert_post_exit_returns.py
python scripts\refresh_divert_post_exit_advanced.py
python scripts\refresh_divert_post_exit_real.py
python scripts\label_divert_post_exit_quality.py
python scripts\refresh_divert_alerts_live.py
python scripts\divert_state_machine.py
python scripts\clean_divert_data.py
python scripts\validate_divert_end_to_end.py
python scripts\verify_divert_operational_semantics.py
python scripts\polish_divert_ui_notes.py
