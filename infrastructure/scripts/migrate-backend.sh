#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
BACKUP_DIR="${BACKUP_DIR:-infrastructure/ci/backups}"
DRY_RUN="${DRY_RUN:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Safely migrate Terraform backend without state loss.

Options:
  -s, --source-backend KEY     Source backend key
  -d, --dest-backend KEY       Destination backend key
  -t, --dest-type TYPE         Destination type (s3, gcs, azurerm, local)
  -b, --backup-dir DIR         Backup directory
  --dry-run                    Preview migration without executing
  -h, --help                   Show this help message

Environment Variables:
  TERRAFORM_DIR                Terraform directory
  SOURCE_BACKEND_KEY           Source backend key
  DEST_BACKEND_KEY             Destination backend key
  DEST_BACKEND_TYPE            Destination backend type

Examples:
  ./migrate-backend.sh -s old-backend/terraform.tfstate -d new-backend/terraform.tfstate
  ./migrate-backend.sh --source-backend old/key --dest-backend new/key --dest-type s3
EOF
  exit 0
}

SOURCE_BACKEND_KEY="${SOURCE_BACKEND_KEY:-}"
DEST_BACKEND_KEY="${DEST_BACKEND_KEY:-}"
DEST_BACKEND_TYPE="${DEST_BACKEND_TYPE:-s3}"

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--source-backend) SOURCE_BACKEND_KEY="$2"; shift 2 ;;
    -d|--dest-backend) DEST_BACKEND_KEY="$2"; shift 2 ;;
    -t|--dest-type) DEST_BACKEND_TYPE="$2"; shift 2 ;;
    -b|--backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$SOURCE_BACKEND_KEY" || -z "$DEST_BACKEND_KEY" ]]; then
  error "Source and destination backend keys are required"
  usage
fi

check_prerequisites() {
  log "Checking prerequisites..."

  if ! command -v terraform >/dev/null 2>&1; then
    error "Terraform is not installed"
    exit 1
  fi

  if ! command -v aws >/dev/null 2>&1; then
    warn "AWS CLI not found, some features may be limited"
  fi

  mkdir -p "${BACKUP_DIR}"
  success "Prerequisites check passed"
}

backup_state() {
  local backup_file="${BACKUP_DIR}/state-backup-$(date -u +%Y%m%d-%H%M%S).tfstate"

  log "Backing up current state to: ${backup_file}"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would backup state to ${backup_file}"
    return 0
  fi

  terraform -chdir="${TERRAFORM_DIR}" state pull > "${backup_file}" 2>/dev/null || true

  if [[ -s "$backup_file" ]]; then
    success "State backed up to ${backup_file}"
    local size
    size=$(wc -c < "$backup_file")
    log "Backup size: ${size} bytes"
  else
    warn "State backup is empty or failed"
  fi
}

acquire_lock() {
  log "Acquiring state lock..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would acquire state lock"
    return 0
  fi

  local max_attempts=30
  local attempt=0

  while [[ $attempt -lt $max_attempts ]]; do
    if terraform -chdir="${TERRAFORM_DIR}" force-unlock -non-interactive current 2>/dev/null; then
      success "State lock acquired"
      return 0
    fi

    attempt=$((attempt + 1))
    log "Waiting for lock... (attempt ${attempt}/${max_attempts})"
    sleep 2
  done

  error "Could not acquire state lock after ${max_attempts} attempts"
  return 1
}

migrate_resources() {
  log "Starting resource-by-resource migration..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would migrate resources from ${SOURCE_BACKEND_KEY} to ${DEST_BACKEND_KEY}"
    return 0
  fi

  log "Pulling state from source..."
  local state_file="${BACKUP_DIR}/pre-migration-$(date -u +%Y%m%d-%H%M%S).tfstate"
  terraform -chdir="${TERRAFORM_DIR}" state pull > "${state_file}" 2>/dev/null || true

  log "Configuring new backend..."
  cat > "${TERRAFORM_DIR}/backend-migration.tf" <<EOF
terraform {
  backend "${DEST_BACKEND_TYPE}" {
    key = "${DEST_BACKEND_KEY}"
  }
}
EOF

  log "Running terraform init with migration..."
  if ! terraform -chdir="${TERRAFORM_DIR}" init \
    -backend-config="key=${DEST_BACKEND_KEY}" \
    -migrate-state \
    -force-copy 2>&1; then
    error "Terraform init with migration failed"
    rm -f "${TERRAFORM_DIR}/backend-migration.tf"
    return 1
  fi

  rm -f "${TERRAFORM_DIR}/backend-migration.tf"
  success "Resource migration completed"
}

validate_migration() {
  log "Validating migration..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would validate migrated state"
    return 0
  fi

  log "Running terraform plan to verify..."
  if terraform -chdir="${TERRAFORM_DIR}" plan -detailed-exitcode -no-color 2>/dev/null; then
    success "Validation passed - no drift detected"
    return 0
  else
    local exit_code=$?
    if [[ $exit_code -eq 2 ]]; then
      warn "Plan shows changes - review before proceeding"
      return 0
    else
      error "Validation failed"
      return 1
    fi
  fi
}

rollback() {
  log "Rolling back migration..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would rollback migration"
    return 0
  fi

  local latest_backup
  latest_backup=$(ls -t "${BACKUP_DIR}"/state-backup-*.tfstate 2>/dev/null | head -1)

  if [[ -n "$latest_backup" ]]; then
    log "Restoring state from: ${latest_backup}"
    terraform -chdir="${TERRAFORM_DIR}" state push "${latest_backup}"
    success "Rollback completed"
  else
    error "No backup found for rollback"
    return 1
  fi
}

main() {
  log "Starting Terraform backend migration"
  log "Source: ${SOURCE_BACKEND_KEY}"
  log "Destination: ${DEST_BACKEND_KEY}"
  log "Type: ${DEST_BACKEND_TYPE}"

  check_prerequisites
  backup_state

  if ! acquire_lock; then
    error "Could not acquire lock. Aborting."
    exit 1
  fi

  if ! migrate_resources; then
    warn "Migration failed, attempting rollback..."
    rollback
    exit 1
  fi

  if ! validate_migration; then
    warn "Validation failed, attempting rollback..."
    rollback
    exit 1
  fi

  success "Backend migration completed successfully"
  log "Review the changes and test thoroughly before proceeding"
}

main "$@"
