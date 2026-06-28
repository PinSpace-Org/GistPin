#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-gistpin}"
BACKUP_NAME="${BACKUP_NAME:-daily-cluster-backup}"
RESTORE_NAME="restore-test-$(date -u +%Y%m%d-%H%M%S)"
RESTORE_NAMESPACE="${RESTORE_NAMESPACE:-gistpin-restore-test}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

check_prerequisites() {
  if ! command -v velero >/dev/null 2>&1; then
    log "ERROR: velero CLI not found."
    exit 1
  fi
  if ! command -v kubectl >/dev/null 2>&1; then
    log "ERROR: kubectl not found."
    exit 1
  fi
  log "Prerequisites check passed."
}

get_latest_backup() {
  log "Finding latest backup for schedule: ${BACKUP_NAME}..."
  local backup
  backup=$(velero backup get --schedule "${BACKUP_NAME}" -o json 2>/dev/null | jq -r '.items | max_by(.metadata.creationTimestamp) | .metadata.name' 2>/dev/null || true)
  if [[ -z "${backup}" || "${backup}" == "null" ]]; then
    log "ERROR: No backup found for schedule ${BACKUP_NAME}."
    exit 1
  fi
  echo "${backup}"
}

create_restore_namespace() {
  log "Creating restore test namespace: ${RESTORE_NAMESPACE}..."
  kubectl create namespace "${RESTORE_NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
}

perform_restore() {
  local backup_name="$1"
  log "Starting restore test from backup: ${backup_name}..."

  velero restore create "${RESTORE_NAME}" \
    --from-backup "${backup_name}" \
    --namespace-mappings "${NAMESPACE}:${RESTORE_NAMESPACE}" \
    --wait

  local status
  status=$(velero restore get "${RESTORE_NAME}" -o json | jq -r '.status.phase')
  log "Restore status: ${status}"

  if [[ "${status}" != "Completed" ]]; then
    log "ERROR: Restore failed with status: ${status}"
    local errors
    errors=$(velero restore describe "${RESTORE_NAME}" 2>/dev/null | grep -i "error" || true)
    if [[ -n "${errors}" ]]; then
      log "Restore errors:"
      echo "${errors}"
    fi
    return 1
  fi

  log "Restore completed successfully."
  return 0
}

verify_restore() {
  log "Verifying restored resources..."
  local resources
  resources=$(kubectl get all -n "${RESTORE_NAMESPACE}" -o name 2>/dev/null | wc -l)
  log "Found ${resources} resources in restore namespace."

  local deployments
  deployments=$(kubectl get deployments -n "${RESTORE_NAMESPACE}" -o name 2>/dev/null | wc -l)
  log "Found ${deployments} deployments."

  local ready
  ready=$(kubectl wait --for=condition=Available --timeout=120s -n "${RESTORE_NAMESPACE}" --all deployments 2>&1 || true)
  if echo "${ready}" | grep -q "met"; then
    log "All deployments are available."
  else
    log "WARNING: Some deployments may not be available: ${ready}"
  fi
}

cleanup_restore() {
  log "Cleaning up restore test resources..."
  velero restore delete "${RESTORE_NAME}" 2>/dev/null || true
  kubectl delete namespace "${RESTORE_NAMESPACE}" --ignore-not-found --wait=false 2>/dev/null || true
  log "Cleanup completed."
}

generate_report() {
  local status="$1"
  mkdir -p "${REPORT_DIR}"
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg backup "${BACKUP_NAME}" \
    --arg restore_name "${RESTORE_NAME}" \
    --arg status "${status}" \
    '{timestamp: $timestamp, backup_schedule: $backup, restore_name: $restore_name, status: $status}' \
    > "${REPORT_DIR}/restore-test-$(date -u +%Y%m%d-%H%M%S).json"
  log "Report generated."
}

send_notification() {
  local status="$1"
  local message="[GistPin] Restore test: ${status} | Backup: ${BACKUP_NAME} | Restore: ${RESTORE_NAME}"
  log "${message}"
  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"${message}\"}" >/dev/null || true
  fi
}

main() {
  check_prerequisites

  local backup_name
  backup_name="$(get_latest_backup)"

  create_restore_namespace

  if perform_restore "${backup_name}"; then
    verify_restore
    generate_report "completed"
    send_notification "completed"
  else
    generate_report "failed"
    send_notification "failed"
    cleanup_restore
    exit 1
  fi

  cleanup_restore
  log "Restore test completed successfully."
}

main "$@"
