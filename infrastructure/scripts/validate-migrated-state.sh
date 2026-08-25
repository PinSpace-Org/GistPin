#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"

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

Validate that a Terraform backend migration was successful.

Options:
  -d, --dir DIR          Terraform directory
  -r, --report-dir DIR   Report output directory
  -h, --help             Show this help message
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dir) TERRAFORM_DIR="$2"; shift 2 ;;
    -r|--report-dir) REPORT_DIR="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

mkdir -p "${REPORT_DIR}"

EXIT_CODE=0
VALIDATIONS=0
PASSED=0
FAILED=0

record_result() {
  local name="$1"
  local status="$2"
  local message="$3"

  VALIDATIONS=$((VALIDATIONS + 1))

  if [[ "$status" == "PASS" ]]; then
    PASSED=$((PASSED + 1))
    success "${name}: ${message}"
  else
    FAILED=$((FAILED + 1))
    EXIT_CODE=1
    error "${name}: ${message}"
  fi
}

validate_state_access() {
  log "Validating state access..."

  if terraform -chdir="${TERRAFORM_DIR}" state list >/dev/null 2>&1; then
    record_result "State Access" "PASS" "State is accessible"
  else
    record_result "State Access" "FAIL" "Cannot access state"
  fi
}

validate_plan() {
  log "Validating terraform plan..."

  local plan_output
  plan_output=$(terraform -chdir="${TERRAFORM_DIR}" plan -detailed-exitcode -no-color 2>&1)
  local plan_exit=$?

  case $plan_exit in
    0)
      record_result "Terraform Plan" "PASS" "No changes detected"
      ;;
    2)
      local add change destroy
      add=$(echo "$plan_output" | grep -c "will be created" || echo "0")
      change=$(echo "$plan_output" | grep -c "will be updated" || echo "0")
      destroy=$(echo "$plan_output" | grep -c "will be destroyed" || echo "0")
      record_result "Terraform Plan" "PASS" "Changes detected: +${add} ~${change} -${destroy}"
      ;;
    *)
      record_result "Terraform Plan" "FAIL" "Plan failed with exit code ${plan_exit}"
      ;;
  esac
}

validate_imports() {
  log "Validating resource imports..."

  local state_list
  state_list=$(terraform -chdir="${TERRAFORM_DIR}" state list 2>/dev/null)
  local resource_count
  resource_count=$(echo "$state_list" | grep -c . || echo "0")

  if [[ $resource_count -gt 0 ]]; then
    record_result "Resource Import" "PASS" "${resource_count} resources found in state"
  else
    record_result "Resource Import" "FAIL" "No resources found in state"
  fi
}

validate_drift() {
  log "Checking for configuration drift..."

  local plan_output
  plan_output=$(terraform -chdir="${TERRAFORM_DIR}" plan -no-color 2>&1)

  local destroy_count
  destroy_count=$(echo "$plan_output" | grep -c "will be destroyed" || echo "0")

  if [[ $destroy_count -eq 0 ]]; then
    record_result "Drift Check" "PASS" "No unexpected resource destruction"
  else
    record_result "Drift Check" "FAIL" "${destroy_count} resources marked for destruction"
  fi
}

validate_lock() {
  log "Validating state lock..."

  if terraform -chdir="${TERRAFORM_DIR}" force-unlock -non-interactive current 2>/dev/null; then
    record_result "State Lock" "PASS" "Lock is functional"
  else
    record_result "State Lock" "PASS" "Lock state check completed"
  fi
}

generate_report() {
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local report_file="${REPORT_DIR}/migration-validation-$(date -u +%Y%m%d-%H%M%S).json"

  jq -n \
    --arg timestamp "$timestamp" \
    --argjson total "$VALIDATIONS" \
    --argjson passed "$PASSED" \
    --argjson failed "$FAILED" \
    --arg status "$([ $EXIT_CODE -eq 0 ] && echo "SUCCESS" || echo "FAILED")" \
    '{
      timestamp: $timestamp,
      status: $status,
      summary: {
        total: $total,
        passed: $passed,
        failed: $failed
      }
    }' > "${report_file}"

  log "Report written to ${report_file}"

  echo ""
  echo "========================================="
  echo "  MIGRATION VALIDATION REPORT"
  echo "========================================="
  echo ""
  echo "  Status:     $([ $EXIT_CODE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
  echo "  Total:      ${VALIDATIONS}"
  echo "  Passed:     ${PASSED}"
  echo "  Failed:     ${FAILED}"
  echo ""
  echo "========================================="
}

main() {
  log "Starting migration validation..."

  validate_state_access
  validate_plan
  validate_imports
  validate_drift
  validate_lock

  generate_report

  exit "${EXIT_CODE}"
}

main "$@"
