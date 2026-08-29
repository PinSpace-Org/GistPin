#!/usr/bin/env bash
# blue-green-workspace.sh - Zero-downtime infra changes via blue/green Terraform
# workspaces. Maintains parallel workspace-blue / workspace-green, validates state
# before a traffic switch, rolls back on failure, and cleans up the old workspace
# after promotion.
# Usage: blue-green-workspace.sh {apply|switch|rollback|cleanup|status} [SLOT]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/terraform"
HISTORY_DIR="${REPO_ROOT}/infrastructure/deployment-history"

BLUE_WORKSPACE="${BLUE_WORKSPACE:-blue}"
GREEN_WORKSPACE="${GREEN_WORKSPACE:-green}"
ACTIVE_LABEL="${ACTIVE_LABEL:-active}"
DRY_RUN="${DRY_RUN:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
info()   { log "${BLUE}INFO${NC}  $*"; }
success(){ log "${GREEN}OK${NC}    $*"; }
warn()   { log "${YELLOW}WARN${NC}  $*"; }
error()  { log "${RED}ERROR${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 COMMAND [SLOT]

Zero-downtime Terraform workspace strategy using parallel blue/green workspaces.

Commands:
  apply   [SLOT]  Apply the target workspace (default: inactive slot)
  switch  [SLOT]  Validate state, then switch traffic to the target slot
  rollback        Roll back traffic to the previously-active slot
  cleanup [SLOT]  Destroy + remove the specified workspace after promotion
  status          Show which workspace is currently active

Options:
  --dry-run                Show actions without applying them

Environment Variables:
  BLUE_WORKSPACE   Name of the blue workspace  (default: blue)
  GREEN_WORKSPACE  Name of the green workspace (default: green)

Examples:
  $0 apply
  $0 apply green
  $0 switch green
  $0 rollback
  $0 cleanup blue
  $0 status
EOF
  exit 0
}

mkdir -p "${HISTORY_DIR}"

command="${1:-}"
[[ -z "${command}" ]] && usage
shift || true

if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN="true"; shift || true; fi
slot="${1:-}"

tf_run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] ${*} (workspace: ${TF_WORKSPACE})"
    return 0
  fi
  info "Running: ${*}"
  "$@"
}

cd "${TF_DIR}"

ensure_workspace() {
  local ws="$1"
  if [[ -z "${ws}" ]]; then
    error "Slot must be 'blue' or 'green'"
    exit 1
  fi
  if ! terraform workspace list | grep -qE "^\s*\*?\s*${ws}\s*$"; then
    warn "Workspace ${ws} does not exist — creating it"
    tf_run terraform workspace new "${ws}"
  fi
}

select_workspace() {
  local ws="$1"
  ensure_workspace "${ws}"
  if [[ "${DRY_RUN}" != "true" ]]; then
    terraform workspace select "${ws}"
  fi
  info "Selected workspace: ${ws}"
}

# inverse_slot: blue <-> green
inverse_slot() {
  if [[ "$1" == "${BLUE_WORKSPACE}" ]]; then
    echo "${GREEN_WORKSPACE}"
  else
    echo "${BLUE_WORKSPACE}"
  fi
}

# active_slot: read the marker element that tracks the promoted slot.
active_slot() {
  local tag_key="gistpin-blue-green-v1"
  local tag_val
  tag_val="$(aws ec2 describe-tags --filters \
    "Name=resource-id,Values=$(terraform output -raw alb_arn 2>/dev/null || echo '')" \
    --output text 2>/dev/null | awk -v k="${tag_key}" '$2==k{print $5}' || true)"

  # Fall back to green marker if the tag can't be read.
  if [[ -z "${tag_val}" ]]; then
    tag_val="${BLUE_WORKSPACE}"
  fi
  echo "${tag_val}"
}

validate_state() {
  local ws="$1"
  info "Validating state for workspace ${ws}..."

  # terraform plan with detailed-exitcode: 0=clean, 1=errors, 2=changes pending.
  if [[ "${DRY_RUN}" != "true" ]]; then
    select_workspace "${ws}"
    local exit_code
    set +e
    terraform plan -detailed-exitcode -input=false -out="/tmp/tf-${ws}.plan" >/dev/null 2>&1
    exit_code=$?
    set -e
    if [[ "${exit_code}" -eq 1 ]]; then
      error "terraform plan failed for workspace ${ws} (exit ${exit_code})"
      return 1
    fi

    if [[ -z "$(terraform state list)" ]]; then
      error "State for workspace ${ws} is empty — refusing to switch."
      return 1
    fi
    info "State for workspace ${ws} is valid (plan exit ${exit_code})"
  fi
  return 0
}

apply_workspace() {
  local ws="${slot:-}"
  if [[ -z "${ws}" ]]; then
    ws="$(inverse_slot "$(active_slot)")"
  fi
  info "Applying workspace ${ws} with ${ws}.tfvars..."
  if [[ "${DRY_RUN}" != "true" ]]; then
    select_workspace "${ws}"
    terraform plan -out="/tmp/tf-${ws}.plan" -var-file="${ws}.tfvars" -input=false
    terraform apply "/tmp/tf-${ws}.plan"
  fi
  success "Applied workspace ${ws}"
}

switch_traffic() {
  local ws="${slot:-}"
  if [[ -z "${ws}" ]]; then
    ws="$(inverse_slot "$(active_slot)")"
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would switch traffic to ${ws}"
    return 0
  fi

  if ! validate_state "${ws}"; then
    error "State validation failed for ${ws} — aborting switch."
    return 1
  fi

  info "Switching active traffic to ${ws}..."
  select_workspace "${ws}"
  terraform apply -var-file="${ws}.tfvars" -input=false -auto-approve

  # Mark the promoted slot as active via the ALB tag so future runs know.
  local alb_arn
  alb_arn="$(terraform output -raw alb_arn 2>/dev/null || true)"
  if [[ -n "${alb_arn}" ]]; then
    aws ec2 create-tags --resources "${alb_arn}" \
      --tags "Key=gistpin-blue-green-v1,Value=${ws}" >/dev/null 2>&1 || true
  fi

  success "Traffic switched to ${ws}"
}

rollback() {
  local previous
  previous="$(inverse_slot "$(active_slot)")"
  warn "Rolling back to previously-active slot: ${previous}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would rollback traffic to ${previous}"
    return 0
  fi

  if ! validate_state "${previous}"; then
    error "Cannot rollback: workspace ${previous} failed state validation."
    return 1
  fi

  info "Applying rollback to ${previous}..."
  select_workspace "${previous}"
  terraform apply -var-file="${previous}.tfvars" -input=false -auto-approve
  success "Rollback complete — active slot: ${previous}"
}

cleanup_workspace() {
  local ws="${slot:-}"
  if [[ -z "${ws}" ]]; then
    error "cleanup requires a slot argument (blue|green)"
    usage
  fi

  # Protect the currently-active workspace from accidental cleanup.
  if [[ "${ws}" == "$(active_slot)" || "${ws}" == "$(inverse_slot "$(active_slot)")" ]]; then
    # Only clean the inactive workspace.
    if [[ "${ws}" == "$(active_slot)" ]]; then
      error "Refusing to clean up active workspace ${ws}."
      exit 1
    fi
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would destroy and delete workspace ${ws}"
    return 0
  fi

  info "Destroying resources in workspace ${ws}..."
  select_workspace "${ws}"
  terraform destroy -var-file="${ws}.tfvars" -input=false -auto-approve
  terraform workspace select "${BLUE_WORKSPACE}" 2>/dev/null || true
  terraform workspace delete "${ws}"
  success "Workspace ${ws} cleaned up"
}

status() {
  local active
  active="$(active_slot)"
  info "Active workspace: ${active}"
  info "Inactive workspace: $(inverse_slot "${active}")"
  info "--- Workspaces ---"
  terraform workspace list
}

case "${command}" in
  apply)                       apply_workspace ;;
  switch)                      switch_traffic ;;
  rollback)                    rollback ;;
  cleanup)                     cleanup_workspace ;;
  status)                      status ;;
  *) error "Unknown command: ${command}"; usage ;;
esac
