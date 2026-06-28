#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
BACKEND_CONFIG="${BACKEND_CONFIG:-}"
ACTION="${1:-}"
STATE_FILE="${2:-}"
EXIT_CODE=0

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
error() { log "ERROR: $*"; EXIT_CODE=1; }

check_prerequisites() {
  if ! command -v terraform >/dev/null 2>&1; then
    error "terraform not found."
  fi
  if [[ ! -d "${TERRAFORM_DIR}" ]]; then
    error "Terraform directory not found: ${TERRAFORM_DIR}"
  fi
}

backup_state() {
  log "Creating state backup..."
  local backup_dir="${TERRAFORM_DIR}/backups"
  mkdir -p "${backup_dir}"

  if terraform -chdir="${TERRAFORM_DIR}" state pull > "${backup_dir}/state-backup-$(date -u +%Y%m%d-%H%M%S).json" 2>&1; then
    log "State backup created in ${backup_dir}"
  else
    error "Failed to backup state."
  fi
}

validate_state() {
  log "Validating current state..."
  if terraform -chdir="${TERRAFORM_DIR}" validate 2>&1; then
    log "Terraform configuration is valid."
  else
    error "Terraform configuration is invalid."
  fi
}

migrate_state() {
  log "Starting state migration..."
  if [[ -n "${BACKEND_CONFIG}" && -f "${BACKEND_CONFIG}" ]]; then
    terraform -chdir="${TERRAFORM_DIR}" init -migrate-state -backend-config="${BACKEND_CONFIG}" 2>&1
  else
    terraform -chdir="${TERRAFORM_DIR}" init -migrate-state 2>&1
  fi

  if [[ $? -eq 0 ]]; then
    log "State migration completed successfully."
  else
    error "State migration failed."
  fi
}

rollback_state() {
  log "Rolling back to previous state..."
  local backup_dir="${TERRAFORM_DIR}/backups"
  local latest_backup
  latest_backup=$(ls -t "${backup_dir}"/state-backup-*.json 2>/dev/null | head -1)
  if [[ -z "${latest_backup}" ]]; then
    error "No backup found for rollback."
  fi
  log "Using backup: ${latest_backup}"
  terraform -chdir="${TERRAFORM_DIR}" state push "${latest_backup}" 2>&1
  log "Rollback completed."
}

import_resource() {
  if [[ $# -lt 2 ]]; then
    error "Usage: $0 import <address> <id>"
  fi
  local address="${2:-}"
  local id="${3:-}"
  if [[ -z "${address}" || -z "${id}" ]]; then
    error "Resource address and ID required."
  fi
  terraform -chdir="${TERRAFORM_DIR}" import "${address}" "${id}" 2>&1
}

mv_resource() {
  if [[ $# -lt 2 ]]; then
    error "Usage: $0 mv <source> <destination>"
  fi
  local source="${2:-}"
  local dest="${3:-}"
  if [[ -z "${source}" || -z "${dest}" ]]; then
    error "Source and destination addresses required."
  fi
  terraform -chdir="${TERRAFORM_DIR}" state mv "${source}" "${dest}" 2>&1
}

rm_resource() {
  local address="${2:-}"
  if [[ -z "${address}" ]]; then
    error "Usage: $0 rm <address>"
  fi
  terraform -chdir="${TERRAFORM_DIR}" state rm "${address}" 2>&1
}

main() {
  check_prerequisites

  case "${ACTION}" in
    backup)
      backup_state
      ;;
    validate)
      validate_state
      ;;
    migrate)
      backup_state
      validate_state
      if [[ "${EXIT_CODE}" -eq 0 ]]; then
        migrate_state
      fi
      ;;
    rollback)
      rollback_state
      ;;
    import)
      import_resource "$@"
      ;;
    mv)
      mv_resource "$@"
      ;;
    rm)
      rm_resource "$@"
      ;;
    *)
      echo "Usage: $0 {backup|validate|migrate|rollback|import|mv|rm} [args...]"
      echo ""
      echo "Actions:"
      echo "  backup                  Create a state backup"
      echo "  validate                Validate current state"
      echo "  migrate [backend-config] Migrate state to new backend"
      echo "  rollback                Rollback to latest backup"
      echo "  import <address> <id>   Import a resource"
      echo "  mv <src> <dst>          Move a resource in state"
      echo "  rm <address>            Remove a resource from state"
      exit 1
      ;;
  esac

  exit "${EXIT_CODE}"
}

main "$@"
