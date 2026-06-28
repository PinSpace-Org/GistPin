#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-gistpin}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
MODE="${MODE:-recommend}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/vpa-report-$(date -u +%Y%m%d-%H%M%S).json"

get_vpa_recommendations() {
  log "Fetching VPA recommendations for namespace: ${NAMESPACE}..."
  local recommendations=()

  local vpas
  vpas=$(kubectl get vpa -n "${NAMESPACE}" -o json 2>/dev/null | jq -r '.items[]?.metadata.name' || true)

  if [[ -z "${vpas}" ]]; then
    log "No VPAs found in namespace ${NAMESPACE}."
    echo "[]"
    return
  fi

  while IFS= read -r vpa_name; do
    [[ -z "${vpa_name}" ]] && continue
    local vpa_json
    vpa_json=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" -o json 2>/dev/null || true)
    if [[ -z "${vpa_json}" ]]; then continue; fi

    local target kind target_name
    target=$(echo "${vpa_json}" | jq -r '.spec.targetRef.kind // "Deployment"')
    target_name=$(echo "${vpa_json}" | jq -r '.spec.targetRef.name // "unknown"')

    local lower_bound upper_bound target_ recommendation
    lower_bound=$(echo "${vpa_json}" | jq -r '.status.recommendation.containerRecommendations[0]?.lowerBound.cpu // ""' 2>/dev/null)
    upper_bound=$(echo "${vpa_json}" | jq -r '.status.recommendation.containerRecommendations[0]?.upperBound.cpu // ""' 2>/dev/null)
    target_=$(echo "${vpa_json}" | jq -r '.status.recommendation.containerRecommendations[0]?.target.cpu // ""' 2>/dev/null)
    recommendation=$(echo "${vpa_json}" | jq -r '.status.recommendation.containerRecommendations[0]?.target // empty' 2>/dev/null)

    if [[ -n "${recommendation}" ]]; then
      log "VPA ${vpa_name}: target=${target_}, lower=${lower_bound}, upper=${upper_bound}"
      recommendations+=("{\"vpa\":\"${vpa_name}\",\"target\":${recommendation}}")
    fi
  done <<< "${vpas}"

  if [[ ${#recommendations[@]} -eq 0 ]]; then
    echo "[]"
  else
    printf "[%s]" "$(IFS=,; echo "${recommendations[*]}")"
  fi
}

apply_recommendations() {
  log "Applying VPA recommendations to ${ENVIRONMENT}..."
  local vpas
  vpas=$(kubectl get vpa -n "${NAMESPACE}" -o json 2>/dev/null | jq -r '.items[]?.metadata.name' || true)

  while IFS= read -r vpa_name; do
    [[ -z "${vpa_name}" ]] && continue
    local recommendation
    recommendation=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" -o json 2>/dev/null | jq '.status.recommendation.containerRecommendations[0]' || true)
    if [[ -z "${recommendation}" || "${recommendation}" == "null" ]]; then continue; fi

    local target_ref
    target_ref=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" -o json | jq -r '.spec.targetRef.kind + "/" + .spec.targetRef.name' 2>/dev/null)

    log "Applying recommendation to ${target_ref}..."
    local cpu_req cpu_lim mem_req mem_lim
    cpu_req=$(echo "${recommendation}" | jq -r '.target.cpu // ""')
    cpu_lim=$(echo "${recommendation}" | jq -r '.upperBound.cpu // ""')
    mem_req=$(echo "${recommendation}" | jq -r '.target.memory // ""')
    mem_lim=$(echo "${recommendation}" | jq -r '.upperBound.memory // ""')

    if [[ -n "${cpu_req}" ]]; then
      log "  CPU: request=${cpu_req}, limit=${cpu_lim}"
    fi
    if [[ -n "${mem_req}" ]]; then
      log "  Memory: request=${mem_req}, limit=${mem_lim}"
    fi
  done <<< "${vpas}"
}

calculate_savings() {
  log "Calculating resource savings from VPA recommendations..."
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{timestamp: $timestamp, message: "Resource savings calculation placeholder"}' \
    > "${REPORT_FILE}"
  log "Report: ${REPORT_FILE}"
}

main() {
  log "VPA mode: ${MODE}, environment: ${ENVIRONMENT}"

  local recommendations
  recommendations="$(get_vpa_recommendations)"

  if [[ "${MODE}" == "apply" && "${ENVIRONMENT}" == "staging" ]]; then
    apply_recommendations
  fi

  calculate_savings

  log "VPA operations completed."
}

main "$@"
