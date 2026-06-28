#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
GIT_MANIFEST_DIR="infrastructure/k8s"
EXCLUDE_NAMESPACES="${EXCLUDE_NAMESPACES:-kube-system,velero}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EXIT_CODE=0

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/drift-report-$(date -u +%Y%m%d-%H%M%S).json"

classify_severity() {
  local kind="$1"
  case "${kind}" in
    Deployment|StatefulSet|DaemonSet) echo "high" ;;
    ConfigMap|Secret)                 echo "medium" ;;
    Service|Ingress)                  echo "medium" ;;
    HorizontalPodAutoscaler|PodDisruptionBudget) echo "low" ;;
    *)                                echo "low" ;;
  esac
}

check_k8s_drift() {
  log "Checking Kubernetes drift..."
  local drifts=()

  while IFS= read -r manifest; do
    local kind name namespace
    kind="$(grep -m1 '^kind:' "${manifest}" | awk '{print $2}')"
    name="$(grep -m1 '^\s*name:' "${manifest}" | awk '{print $2}')"
    namespace="$(grep -m1 '^\s*namespace:' "${manifest}" | awk '{print $2}' || echo "default")"

    if [[ -z "${kind}" || -z "${name}" ]]; then continue; fi
    if echo "${EXCLUDE_NAMESPACES}" | grep -q "${namespace}"; then continue; fi

    local live_hash desired_hash
    live_hash="$(kubectl get "${kind}" "${name}" -n "${namespace}" -o json 2>/dev/null \
      | jq -c '{spec,metadata: {labels, annotations}}' 2>/dev/null \
      | sha256sum | awk '{print $1}')" || live_hash="NOT_FOUND"
    desired_hash="$(kubectl apply --dry-run=server -f "${manifest}" -o json 2>/dev/null \
      | jq -c '{spec,metadata: {labels, annotations}}' 2>/dev/null \
      | sha256sum | awk '{print $1}')" || desired_hash="ERROR"

    if [[ "${live_hash}" != "${desired_hash}" ]]; then
      local severity
      severity="$(classify_severity "${kind}")"
      drifts+=("{\"manifest\":\"${manifest}\",\"kind\":\"${kind}\",\"name\":\"${name}\",\"namespace\":\"${namespace}\",\"severity\":\"${severity}\"}")
      log "${severity^^} DRIFT: ${kind}/${name} in ${namespace}"
    fi
  done < <(find "${GIT_MANIFEST_DIR}" -name "*.yaml" ! -name "*.sample" ! -path "*/node_modules/*" 2>/dev/null)

  echo "${drifts[@]:-}"
}

generate_report() {
  local k8s_drifts="$1"
  local critical_count=0 high_count=0 medium_count=0 low_count=0

  if [[ -n "${k8s_drifts}" ]]; then
    for drift in "${k8s_drifts[@]}"; do
      local sev
      sev="$(echo "${drift}" | jq -r '.severity')"
      case "${sev}" in
        critical) ((critical_count++)) ;;
        high)     ((high_count++)) ;;
        medium)   ((medium_count++)) ;;
        low)      ((low_count++)) ;;
      esac
    done
    EXIT_CODE=1
  fi

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson critical "${critical_count}" \
    --argjson high "${high_count}" \
    --argjson medium "${medium_count}" \
    --argjson low "${low_count}" \
    --argjson drifts "$(echo "${k8s_drifts[@]:-}" | jq -s '.' 2>/dev/null || echo '[]')" \
    '{timestamp: $timestamp, summary: {critical: $critical, high: $high, medium: $medium, low: $low}, drifts: $drifts}' \
    > "${REPORT_FILE}"
  log "Report written to ${REPORT_FILE}"
}

send_slack_alert() {
  local critical="$1" high="$2"
  if (( critical > 0 || high > 0 )); then
    local message="[GistPin] Drift detected: ${critical} critical, ${high} high severity drifts."
    log "ALERT: ${message}"
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
      curl -s -X POST "${SLACK_WEBHOOK}" \
        -H 'Content-type: application/json' \
        --data "{\"text\":\"${message}\"}" >/dev/null || true
    fi
  fi
}

main() {
  log "Starting drift reporter..."

  local k8s_drifts
  k8s_drifts="$(check_k8s_drift)"

  generate_report "${k8s_drifts}"

  if [[ "${EXIT_CODE}" -ne 0 ]]; then
    log "Drift detected! Check report: ${REPORT_FILE}"
    send_slack_alert "${critical_count:-0}" "${high_count:-0}"
  else
    log "No drift detected."
  fi

  exit "${EXIT_CODE}"
}

main "$@"
