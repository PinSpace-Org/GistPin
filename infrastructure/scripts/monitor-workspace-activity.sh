#!/usr/bin/env bash
# monitor-workspace-activity.sh - Monitor Terraform Cloud/Enterprise workspace
#                                 activity for compliance and auditing.
#
# Pulls run history per workspace from the TFE API and reports:
#   - recent runs with actor + status (run history / user activity)
#   - failed runs (for alerting)
#   - long-running plans (exceeding a threshold)
# With --digest it emits a weekly activity summary suitable for posting to Slack.
#
# Environment:
#   TFE_TOKEN         Terraform Cloud/Enterprise API token (required)
#   TFE_ADDR          TFE host (default https://app.terraform.io)
#   TFE_ORG           Organization name (required)
#   PLAN_SLA_MINUTES  Long-running-plan threshold (default 20)
set -euo pipefail

TFE_ADDR="${TFE_ADDR:-https://app.terraform.io}"
PLAN_SLA_MINUTES="${PLAN_SLA_MINUTES:-20}"
MODE="report"
[[ "${1:-}" == "--digest" ]] && MODE="digest"

command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }
: "${TFE_TOKEN:?TFE_TOKEN is required}"
: "${TFE_ORG:?TFE_ORG is required}"

api() {
  curl -sS -H "Authorization: Bearer ${TFE_TOKEN}" \
    -H "Content-Type: application/vnd.api+json" \
    "${TFE_ADDR}/api/v2/$1"
}

# List workspaces in the org.
mapfile -t WORKSPACES < <(api "organizations/${TFE_ORG}/workspaces?page%5Bsize%5D=100" \
  | jq -r '.data[] | "\(.id)\t\(.attributes.name)"')

FAILED_TOTAL=0
LONG_PLAN_TOTAL=0

echo "=== Terraform Workspace Activity (${TFE_ORG}) ==="

for ws in "${WORKSPACES[@]}"; do
  ws_id="${ws%%$'\t'*}"
  ws_name="${ws##*$'\t'}"

  # Last 20 runs for this workspace.
  runs="$(api "workspaces/${ws_id}/runs?page%5Bsize%5D=20")"

  echo ""
  echo "Workspace: ${ws_name}"

  # Run history with actor + status.
  echo "$runs" | jq -r '
    .data[] |
    "  \(.attributes."created-at"[0:19])  \(.attributes.status | (. + "            ")[0:12])  by \(.attributes."created-by-actor" // "unknown")"
  ' 2>/dev/null | head -10 || echo "  (no runs)"

  # Failed runs.
  failed="$(echo "$runs" | jq '[.data[] | select(.attributes.status == "errored")] | length')"
  FAILED_TOTAL=$((FAILED_TOTAL + failed))
  [[ "$failed" -gt 0 ]] && echo "  ⚠ ${failed} failed run(s)"

  # Long-running plans: plan duration over the SLA.
  long="$(echo "$runs" | jq --argjson sla "$PLAN_SLA_MINUTES" '
    [ .data[]
      | select(.attributes."status-timestamps"."planning-at" != null and
               .attributes."status-timestamps"."planned-at"  != null)
      | ((.attributes."status-timestamps"."planned-at" | fromdateiso8601)
         - (.attributes."status-timestamps"."planning-at" | fromdateiso8601)) / 60
      | select(. > $sla)
    ] | length')"
  LONG_PLAN_TOTAL=$((LONG_PLAN_TOTAL + long))
  [[ "$long" -gt 0 ]] && echo "  ⏱ ${long} plan(s) exceeded ${PLAN_SLA_MINUTES}m"
done

echo ""
echo "Totals: ${FAILED_TOTAL} failed run(s), ${LONG_PLAN_TOTAL} long-running plan(s)."

if [[ "$MODE" == "digest" ]]; then
  echo ""
  echo "=== Weekly Activity Digest ==="
  echo "Organization: ${TFE_ORG}"
  echo "Workspaces monitored: ${#WORKSPACES[@]}"
  echo "Failed runs: ${FAILED_TOTAL}"
  echo "Long-running plans (> ${PLAN_SLA_MINUTES}m): ${LONG_PLAN_TOTAL}"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

# Non-zero exit if there are failures, so a CI/cron wrapper can alert.
[[ "$FAILED_TOTAL" -eq 0 ]]
