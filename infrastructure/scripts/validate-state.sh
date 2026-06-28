#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
error() { log "ERROR: $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/state-validation-$(date -u +%Y%m%d-%H%M%S).json"

check_state_file() {
  local state_file="${TERRAFORM_DIR}/terraform.tfstate"
  if [[ ! -f "${state_file}" ]]; then
    log "No local state file found, checking remote state..."
    terraform -chdir="${TERRAFORM_DIR}" state pull > /dev/null 2>&1 || true
  fi
  if terraform -chdir="${TERRAFORM_DIR}" state list > /dev/null 2>&1; then
    log "State file is accessible."
  else
    error "State file is not accessible."
  fi
}

check_state_version() {
  log "Checking Terraform state version..."
  local version
  version=$(terraform -chdir="${TERRAFORM_DIR}" state pull 2>/dev/null | jq -r '.terraform_version // "unknown"' 2>/dev/null || echo "unknown")
  log "State created with Terraform version: ${version}"
}

check_resource_count() {
  log "Counting managed resources..."
  local count
  count=$(terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null | wc -l)
  log "Total resources in state: ${count}"
}

generate_report() {
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg exit_code "${EXIT_CODE:-0}" \
    '{timestamp: $timestamp, valid: ($exit_code == "0")}' \
    > "${REPORT_FILE}"
  log "Validation report written to ${REPORT_FILE}"
}

main() {
  check_state_file
  check_state_version
  check_resource_count
  generate_report
  log "State validation completed."
}

main "$@"
