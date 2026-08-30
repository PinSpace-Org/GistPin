#!/usr/bin/env bash
# sync-oncall.sh - Sync PagerDuty on-call schedules into Grafana.
#
# Queries the PagerDuty API for who is currently on-call for each configured
# schedule and publishes it to a Grafana-readable ConfigMap so dashboards and
# alert annotations show the current responder. Intended to run on a short
# schedule (e.g. every 5 minutes) as a CronJob.
#
# Environment:
#   PAGERDUTY_API_TOKEN   PagerDuty REST API token (required)
#   SYNC_CONFIG           Path to oncall-sync config (default below)
#   DRY_RUN=true          Print the result instead of writing the ConfigMap
set -euo pipefail

SYNC_CONFIG="${SYNC_CONFIG:-/etc/oncall/oncall-sync.yaml}"
DRY_RUN="${DRY_RUN:-false}"
PD_API="https://api.pagerduty.com"

command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }
: "${PAGERDUTY_API_TOKEN:?PAGERDUTY_API_TOKEN is required}"

# Extract "id team" pairs from the sync config without a YAML parser dependency:
# match lines like "- id: PSCHED01" followed by "team: platform".
mapfile -t SCHEDULES < <(awk '
  /- id:/    { id=$3 }
  /team:/    { if (id != "") { print id, $2; id="" } }
' "$SYNC_CONFIG")

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
soon="$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+1M +%Y-%m-%dT%H:%M:%SZ)"

# Query PagerDuty for the current on-call user of a schedule.
current_oncall() {
  local schedule_id="$1"
  curl -sS -H "Authorization: Token token=${PAGERDUTY_API_TOKEN}" \
    -H "Accept: application/vnd.pagerduty+json;version=2" \
    "${PD_API}/schedules/${schedule_id}/users?since=${now}&until=${soon}" \
    | jq -r '.users[0].name // "UNASSIGNED"'
}

# Build the on-call map.
oncall_json="{}"
for entry in "${SCHEDULES[@]}"; do
  read -r sched team <<<"$entry"
  who="$(current_oncall "$sched")"
  echo "  ${team}: ${who} (schedule ${sched})"
  oncall_json="$(echo "$oncall_json" | jq --arg t "$team" --arg w "$who" '. + {($t): $w}')"
done

echo "Current on-call map:"
echo "$oncall_json" | jq .

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] not writing ConfigMap"
  exit 0
fi

# Publish to Grafana-readable ConfigMap (idempotent apply).
kubectl -n monitoring create configmap grafana-current-oncall \
  --from-literal=oncall.json="$oncall_json" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Published current on-call to grafana-current-oncall ConfigMap."
