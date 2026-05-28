#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-gistpin-service}"
TRIGGERS_FILE="infrastructure/ci/rollback-triggers.json"
REPORT_FILE="infrastructure/ci/canary-report.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

if [[ ! -f "${TRIGGERS_FILE}" ]]; then
  echo "Missing rollback triggers: ${TRIGGERS_FILE}"
  exit 1
fi

deploy_stage() {
  local traffic="$1"
  echo "Routing ${traffic}% traffic to canary for ${SERVICE_NAME}"
}

check_metrics() {
  local error_threshold
  error_threshold="$(jq -r '.errorRateThreshold' "${TRIGGERS_FILE}")"
  local simulated_error_rate="${SIMULATED_ERROR_RATE:-0.01}"
  awk "BEGIN {exit !(${simulated_error_rate} <= ${error_threshold})}"
}

roll_back() {
  echo "Rollback triggered for ${SERVICE_NAME}"
  jq -n --arg status "rolled_back" --arg service "${SERVICE_NAME}" \
    '{status:$status,service:$service,timestamp:now|todate}' > "${REPORT_FILE}"
}

success_report() {
  jq -n --arg status "completed" --arg service "${SERVICE_NAME}" \
    '{status:$status,service:$service,timestamp:now|todate}' > "${REPORT_FILE}"
}

while IFS= read -r stage; do
  traffic="$(jq -r '.trafficPercent' <<<"${stage}")"
  wait_secs="$(jq -r '.waitSeconds' <<<"${stage}")"
  deploy_stage "${traffic}"
  if ! check_metrics; then
    roll_back
    exit 1
  fi
  if [[ "${wait_secs}" -gt 0 ]]; then
    sleep 1
  fi
done < <(jq -c '.stages[]' "${TRIGGERS_FILE}")

success_report
echo "Canary deployment completed successfully"
