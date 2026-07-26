#!/usr/bin/env bash
# check-freeze-window.sh — return 0 if deployments are allowed, 1 if frozen
# Usage: ./check-freeze-window.sh
set -euo pipefail

NOW_UTC=$(date -u +"%H:%M")
DOW=$(date -u +"%u")   # 1=Mon ... 7=Sun

# Freeze windows (UTC). Edit to match your policy.
# Format: "DOW_START DOW_END HH:MM HH:MM" (DOW inclusive range)
FREEZE_WINDOWS=(
  "5 7 00:00 23:59"   # Friday–Sunday: full weekend freeze
  "1 5 22:00 23:59"   # Weeknight late-night freeze
  "1 5 00:00 06:00"   # Weeknight early-morning freeze
)

in_range() {
  local start="$1" end="$2"
  [[ "$NOW_UTC" > "$start" || "$NOW_UTC" == "$start" ]] && \
  [[ "$NOW_UTC" < "$end"   || "$NOW_UTC" == "$end" ]]
}

for window in "${FREEZE_WINDOWS[@]}"; do
  read -r dow_start dow_end time_start time_end <<< "$window"
  if [[ "$DOW" -ge "$dow_start" && "$DOW" -le "$dow_end" ]]; then
    if in_range "$time_start" "$time_end"; then
      echo "FREEZE: deployments blocked (window: DOW ${dow_start}-${dow_end} ${time_start}-${time_end} UTC)"
      echo "To override, set FREEZE_OVERRIDE=emergency and re-run."
      [[ "${FREEZE_OVERRIDE:-}" == "emergency" ]] && { echo "OVERRIDE: emergency override in effect."; exit 0; }
      exit 1
    fi
  fi
done

echo "OK: no active freeze window."
exit 0
