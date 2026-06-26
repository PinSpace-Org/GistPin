#!/usr/bin/env bash
# track-mttr.sh — DORA MTTR tracker
# Detects incidents from Prometheus/Alertmanager and calculates Mean Time To Recovery.
set -euo pipefail

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
OUTPUT_DIR="${OUTPUT_DIR:-/var/log/mttr}"
WINDOW_HOURS="${WINDOW_HOURS:-168}"  # 7 days

mkdir -p "$OUTPUT_DIR"

LOG="$OUTPUT_DIR/mttr-$(date +%Y%m%d).log"
REPORT="$OUTPUT_DIR/mttr-report-$(date +%Y%m%d).json"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

# ── Fetch fired/resolved alerts from Alertmanager ────────────────────────────
fetch_alerts() {
  local am_url="${ALERTMANAGER_URL:-http://localhost:9093}"
  curl -sf "${am_url}/api/v2/alerts?active=false&silenced=false&inhibited=false" \
    -H "Accept: application/json" 2>/dev/null || echo "[]"
}

# ── Query Prometheus for incident windows ────────────────────────────────────
query_incidents() {
  local end_ts
  end_ts=$(date +%s)
  local start_ts=$(( end_ts - WINDOW_HOURS * 3600 ))

  curl -sf "${PROMETHEUS_URL}/api/v1/query_range" \
    --data-urlencode "query=ALERTS{alertstate=\"firing\",severity=~\"critical|warning\"}" \
    --data-urlencode "start=${start_ts}" \
    --data-urlencode "end=${end_ts}" \
    --data-urlencode "step=60" \
    -H "Accept: application/json" 2>/dev/null \
  | python3 - <<'PYEOF'
import json, sys
data = json.load(sys.stdin)
results = data.get("data", {}).get("result", [])
incidents = []
for series in results:
  alert = series["metric"].get("alertname", "unknown")
  svc   = series["metric"].get("job", "unknown")
  vals  = series["values"]
  if not vals:
    continue
  start = float(vals[0][0])
  end   = float(vals[-1][0])
  duration_min = (end - start) / 60
  incidents.append({"alert": alert, "service": svc,
                    "start_ts": start, "end_ts": end,
                    "duration_minutes": round(duration_min, 2)})
print(json.dumps(incidents))
PYEOF
}

# ── Calculate MTTR stats ──────────────────────────────────────────────────────
calculate_mttr() {
  local incidents_json="$1"
  python3 - "$incidents_json" <<'PYEOF'
import json, sys, statistics
from collections import defaultdict

incidents = json.loads(open(sys.argv[1]).read())
if not incidents:
  print(json.dumps({"mttr_minutes": 0, "incident_count": 0, "by_service": {}}))
  sys.exit(0)

durations = [i["duration_minutes"] for i in incidents]
by_service = defaultdict(list)
for i in incidents:
  by_service[i["service"]].append(i["duration_minutes"])

report = {
  "mttr_minutes": round(statistics.mean(durations), 2),
  "median_minutes": round(statistics.median(durations), 2),
  "p95_minutes": round(sorted(durations)[int(len(durations) * 0.95)], 2) if len(durations) > 1 else durations[0],
  "incident_count": len(incidents),
  "by_service": {svc: round(statistics.mean(d), 2) for svc, d in by_service.items()},
  "incidents": incidents,
}
print(json.dumps(report, indent=2))
PYEOF
}

# ── Main ──────────────────────────────────────────────────────────────────────
log "Starting MTTR calculation (window: ${WINDOW_HOURS}h)"

incidents_file="$OUTPUT_DIR/incidents-tmp.json"
query_incidents > "$incidents_file" || echo "[]" > "$incidents_file"
incident_count=$(python3 -c "import json; print(len(json.load(open('$incidents_file'))))")
log "Found $incident_count incidents in window"

calculate_mttr "$incidents_file" > "$REPORT"
log "Report written to $REPORT"

# Print summary
python3 - "$REPORT" <<'PYEOF'
import json, sys
r = json.load(open(sys.argv[1]))
print(f"\n{'='*40}")
print(f"  MTTR Summary")
print(f"{'='*40}")
print(f"  Incidents      : {r['incident_count']}")
print(f"  Mean MTTR      : {r['mttr_minutes']} min")
print(f"  Median MTTR    : {r.get('median_minutes', 'N/A')} min")
print(f"  P95 MTTR       : {r.get('p95_minutes', 'N/A')} min")
print(f"{'='*40}")
if r.get("by_service"):
  print("  By Service:")
  for svc, m in r["by_service"].items():
    print(f"    {svc:<25} {m} min")
print(f"{'='*40}\n")
PYEOF

rm -f "$incidents_file"
log "Done."
