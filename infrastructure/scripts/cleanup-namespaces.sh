#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

DRY_RUN="${DRY_RUN:-true}"
EXCLUDE_NAMESPACES="${EXCLUDE_NAMESPACES:-kube-system,velero,gistpin,istio-system,monitoring,default}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/namespace-cleanup-$(date -u +%Y%m%d-%H%M%S).json"

get_abandoned_namespaces() {
  log "Identifying abandoned namespaces..."
  local abandoned=()

  local all_ns
  all_ns=$(kubectl get namespaces -o json 2>/dev/null | jq -r '.items[]?.metadata.name' || true)

  while IFS= read -r ns; do
    [[ -z "${ns}" ]] && continue

    local skip=false
    IFS=',' read -ra exclude_list <<< "${EXCLUDE_NAMESPACES}"
    for exclude in "${exclude_list[@]}"; do
      if [[ "${ns}" == "${exclude}" ]]; then
        skip=true
        break
      fi
    done
    ${skip} && continue

    local cleanup_date
    cleanup_date=$(kubectl get namespace "${ns}" -o json 2>/dev/null | jq -r '.metadata.labels["cleanup-date"] // ""' 2>/dev/null)
    if [[ -z "${cleanup_date}" ]]; then
      continue
    fi

    local now_epoch cleanup_epoch
    now_epoch=$(date -u +%s)
    if [[ "$(uname)" == "Darwin" ]]; then
      cleanup_epoch=$(date -j -f "%Y-%m-%d" "${cleanup_date}" +%s 2>/dev/null || echo "0")
    else
      cleanup_epoch=$(date -d "${cleanup_date}" +%s 2>/dev/null || echo "0")
    fi

    if [[ "${cleanup_epoch}" -gt 0 && "${now_epoch}" -gt "${cleanup_epoch}" ]]; then
      local owner
      owner=$(kubectl get namespace "${ns}" -o json 2>/dev/null | jq -r '.metadata.labels["owner"] // "unknown"')
      log "ABANDONED: ${ns} (owner: ${owner}, cleanup date: ${cleanup_date})"
      abandoned+=("${ns}")
    fi
  done <<< "${all_ns}"

  if [[ ${#abandoned[@]} -eq 0 ]]; then
    echo "[]"
  else
    printf '["%s"]' "$(IFS='","'; echo "${abandoned[*]}")"
  fi
}

cleanup_namespace() {
  local ns="$1"
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "[DRY RUN] Would delete namespace: ${ns}"
    return
  fi
  log "Deleting namespace: ${ns}"
  kubectl delete namespace "${ns}" --wait=false 2>/dev/null || true
  log "Namespace ${ns} deleted."
}

generate_report() {
  local abandoned_json="$1"
  local count
  count=$(echo "${abandoned_json}" | jq 'length')
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson abandoned "${abandoned_json}" \
    --argjson count "${count}" \
    --arg dry_run "${DRY_RUN}" \
    '{timestamp: $timestamp, namespaces_found: $count, dry_run: $dry_run, namespaces: $abandoned}' \
    > "${REPORT_FILE}"
  log "Report written to ${REPORT_FILE}"
}

main() {
  log "Starting namespace cleanup (DRY_RUN=${DRY_RUN})..."

  local abandoned_json
  abandoned_json="$(get_abandoned_namespaces)"

  local namespaces
  namespaces=$(echo "${abandoned_json}" | jq -r '.[]' 2>/dev/null || true)
  if [[ -z "${namespaces}" ]]; then
    log "No abandoned namespaces found."
    generate_report "[]"
    exit 0
  fi

  while IFS= read -r ns; do
    [[ -z "${ns}" ]] && continue
    cleanup_namespace "${ns}"
  done <<< "${namespaces}"

  generate_report "${abandoned_json}"
  log "Namespace cleanup completed."
}

main "$@"
