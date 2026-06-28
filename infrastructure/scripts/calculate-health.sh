#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-gistpin}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/health-calc-$(date -u +%Y%m%d-%H%M%S).json"

calculate_availability() {
  local total_replicas=0 available_replicas=0
  local deployments

  deployments=$(kubectl get deployments -n "${NAMESPACE}" -o json 2>/dev/null || echo "{}")
  total_replicas=$(echo "${deployments}" | jq -r '[.items[].spec.replicas] | add // 0')
  available_replicas=$(echo "${deployments}" | jq -r '[.items[].status.availableReplicas // 0] | add // 0')

  if [[ "${total_replicas}" -eq 0 ]]; then
    echo "0"
  else
    echo "scale=2; ${available_replicas} * 100 / ${total_replicas}" | bc
  fi
}

calculate_resource_health() {
  local cpu_usage=0 mem_usage=0

  local nodes
  nodes=$(kubectl top nodes 2>/dev/null | tail -n +2 || echo "")
  if [[ -n "${nodes}" ]]; then
    local cpu_pct mem_pct
    cpu_pct=$(echo "${nodes}" | awk '{print $3}' | sed 's/%//' | awk '{s+=$1} END {if (NR>0) print s/NR; else print 0}')
    mem_pct=$(echo "${nodes}" | awk '{print $5}' | sed 's/%//' | awk '{s+=$1} END {if (NR>0) print s/NR; else print 0}')
    cpu_usage=$(echo "100 - ${cpu_pct:-0}" | bc)
    mem_usage=$(echo "100 - ${mem_pct:-0}" | bc)
  fi

  echo "scale=2; (${cpu_usage} + ${mem_usage}) / 2" | bc
}

calculate_error_health() {
  local error_rate=0
  local pods
  pods=$(kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase=Running -o json 2>/dev/null || echo "{}")
  local restart_count
  restart_count=$(echo "${pods}" | jq -r '[.items[].status.containerStatuses[].restartCount // 0] | add // 0')

  if [[ "${restart_count}" -gt 10 ]]; then
    error_rate=50
  elif [[ "${restart_count}" -gt 5 ]]; then
    error_rate=75
  else
    error_rate=100
  fi
  echo "${error_rate}"
}

generate_report() {
  local availability="$1"
  local resource_health="$2"
  local error_health="$3"
  local overall
  overall=$(echo "scale=2; (${availability} * 0.35) + (0 * 0.25) + (${error_health} * 0.25) + (${resource_health} * 0.15)" | bc)

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson availability "${availability}" \
    --argjson resource_health "${resource_health}" \
    --argjson error_health "${error_health}" \
    --argjson overall "${overall}" \
    '{timestamp: $timestamp, scores: {availability: $availability, resource_usage: $resource_health, error_rate: $error_health, overall: $overall}}' \
    > "${REPORT_FILE}"
  log "Health report written to ${REPORT_FILE}"
  log "Overall health score: ${overall}"

  if [[ -n "${SLACK_WEBHOOK}" ]] && (( $(echo "${overall} < 80" | bc -l) )); then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin] Health score dropped to ${overall}\"}" >/dev/null || true
  fi
}

main() {
  log "Calculating infrastructure health scores..."

  local availability
  availability=$(calculate_availability)
  log "Availability score: ${availability}"

  local resource_health
  resource_health=$(calculate_resource_health)
  log "Resource health score: ${resource_health}"

  local error_health
  error_health=$(calculate_error_health)
  log "Error health score: ${error_health}"

  generate_report "${availability}" "${resource_health}" "${error_health}"
  log "Health calculation completed."
}

main "$@"
