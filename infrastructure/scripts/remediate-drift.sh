#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
LOG_DIR="${SCRIPT_DIR}/../logs"
STATE_BUCKET="gistpin-terraform-state"
STATE_KEY="gistpin/terraform.tfstate"
LOCK_TABLE="gistpin-terraform-locks"
LOCK_ID="drift-remediation-lock"
LOCK_TTL=3600
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
GITHUB_REPO="${GITHUB_REPO:-PinSpace-Org/GistPin}"
APPROVAL_TIMEOUT="${APPROVAL_TIMEOUT:-3600}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_info() { log "${BLUE}INFO${NC} $1"; }
log_warn() { log "${YELLOW}WARN${NC} $1"; }
log_error() { log "${RED}ERROR${NC} $1"; }

mkdir -p "${LOG_DIR}"

acquire_lock() {
    log_info "Acquiring drift remediation lock..."
    local lock_exists
    lock_exists=$(aws dynamodb get-item \
        --table-name "${LOCK_TABLE}" \
        --key "{\"LockID\": {\"S\": \"${LOCK_ID}\"}}" \
        --no-paginate 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); print('true' if 'Item' in d else 'false')" 2>/dev/null || echo "false")

    if [ "${lock_exists}" = "true" ]; then
        local lock_ttl
        lock_ttl=$(aws dynamodb get-item \
            --table-name "${LOCK_TABLE}" \
            --key "{\"LockID\": {\"S\": \"${LOCK_ID}\"}}" \
            --projection-expression "TTL" \
            --no-paginate 2>/dev/null | python -c "import sys,json; d=json.load(sys.stdin); print(d['Item']['TTL']['N'])" 2>/dev/null || echo "0")
        local now
        now=$(date +%s)
        if [ "${lock_ttl}" -gt "${now}" ]; then
            log_error "Lock ${LOCK_ID} is held by another process (expires: ${lock_ttl}). Exiting."
            exit 1
        else
            log_warn "Stale lock detected (expired: ${lock_ttl}), forcing release..."
            release_lock
        fi
    fi

    local ttl
    ttl=$(($(date +%s) + LOCK_TTL))
    aws dynamodb put-item \
        --table-name "${LOCK_TABLE}" \
        --item "{\"LockID\": {\"S\": \"${LOCK_ID}\"}, \"TTL\": {\"N\": \"${ttl}\"}, \"Owner\": {\"S\": \"drift-remediation\"}, \"Timestamp\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}" \
        --condition-expression "attribute_not_exists(LockID)" \
        2>/dev/null || {
            log_error "Failed to acquire lock. Another process may have started."
            exit 1
        }
    log_info "Lock acquired successfully (expires in ${LOCK_TTL}s)."
}

release_lock() {
    log_info "Releasing drift remediation lock..."
    aws dynamodb delete-item \
        --table-name "${LOCK_TABLE}" \
        --key "{\"LockID\": {\"S\": \"${LOCK_ID}\"}" \
        --no-paginate 2>/dev/null || true
    log_info "Lock released."
}

cleanup() {
    log_info "Cleaning up temporary files..."
    release_lock
    rm -f "${TERRAFORM_DIR}/plan.bin"
    rm -f "${TERRAFORM_DIR}/plan-drift.json"
    rm -f "${TERRAFORM_DIR}/plan-resource-changes.json"
    rm -f "${TERRAFORM_DIR}/safe-changes.json"
    rm -f "${TERRAFORM_DIR}/manual-changes.json"
}
trap cleanup EXIT

run_terraform_plan() {
    log_info "Running terraform plan (refresh + plan)..."
    cd "${TERRAFORM_DIR}"

    export AWS_PAGER=""

    terraform plan \
        -input=false \
        -lock=true \
        -lock-timeout="300s" \
        -out="${TERRAFORM_DIR}/plan.bin" \
        > "${LOG_DIR}/plan-stdout.log" \
        2> "${LOG_DIR}/plan-stderr.log"

    if [ ! -f "${TERRAFORM_DIR}/plan.bin" ]; then
        log_error "Terraform plan failed to produce output. Check ${LOG_DIR}/plan-stderr.log"
        exit 1
    fi

    local exit_code
    exit_code=${PIPESTATUS[0]}
    if [ "${exit_code}" -ne 0 ] && [ "${exit_code}" -ne 2 ]; then
        log_error "Terraform plan failed with exit code ${exit_code}"
        exit "${exit_code}"
    fi
}

parse_plan() {
    log_info "Parsing terraform plan output..."
    cd "${TERRAFORM_DIR}"

    local plan_json
    plan_json=$(terraform show -json "${TERRAFORM_DIR}/plan.bin" 2>/dev/null) || {
        log_error "Failed to export plan as JSON"
        return 1
    }

    echo "${plan_json}" > "${TERRAFORM_DIR}/plan-drift.json"
    echo "${plan_json}" | python "${SCRIPT_DIR}/parse-tf-plan.py" > "${TERRAFORM_DIR}/plan-resource-changes.json"

    if [ ! -s "${TERRAFORM_DIR}/plan-resource-changes.json" ]; then
        log_info "No changes detected. Infrastructure is in sync."
        exit 0
    fi
}

display_plan_summary() {
    log_info "Plan summary:"
    local safe_count manual_count total_count
    safe_count=$(python -c "import json; print(len(json.load(open('${TERRAFORM_DIR}/safe-changes.json'))))")
    manual_count=$(python -c "import json; print(len(json.load(open('${TERRAFORM_DIR}/manual-changes.json'))))")
    total_count=$((safe_count + manual_count))

    log_info "  Total changes: ${total_count}"
    log_info "  Safe to auto-remediate: ${safe_count}"
    log_info "  Manual review required: ${manual_count}"

    if [ "${total_count}" -gt 0 ]; then
        log_info "Changes summary:"
        cat "${TERRAFORM_DIR}/plan-resource-changes.json"
    fi
}

notify_manual_changes() {
    log_info "Processing manual changes for notification..."

    if [ -z "${NOTIFICATION_WEBHOOK}" ]; then
        log_warn "NOTIFICATION_WEBHOOK not set. Skipping notifications."
        return 0
    fi

    python "${SCRIPT_DIR}/notify-changes.py" \
        --manual-changes "${TERRAFORM_DIR}/manual-changes.json" \
        --webhook "${NOTIFICATION_WEBHOOK}" \
        --github-repo "${GITHUB_REPO}" \
        --timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>/dev/null || log_warn "Notification step failed or skipped."
}

remediate_auto() {
    local safe_changes_file="${TERRAFORM_DIR}/safe-changes.json"

    log_info "Auto-remediating safe changes..."
    local safe_count
    safe_count=$(python -c "import json; d=json.load(open('${safe_changes_file}')); print(len(d))")

    if [ "${safe_count}" -eq 0 ]; then
        log_info "No safe changes to auto-remediate."
        return 0
    fi

    if [ "${DRY_RUN:-}" = "true" ]; then
        log_info "[DRY RUN] Would apply ${safe_count} safe changes via terraform apply"
        python -c "
import json
changes = json.load(open('${safe_changes_file}'))
for c in changes:
    print(f\"  - {c['address']} ({c['change']}): {c['reason']}\")
"
        return 0
    fi

    log_info "Running terraform apply for ${safe_count} safe changes..."
    terraform apply \
        -input=false \
        -lock=true \
        -lock-timeout="300s" \
        -auto-approve \
        "${TERRAFORM_DIR}/plan.bin" \
        > "${LOG_DIR}/apply-stdout.log" \
        2> "${LOG_DIR}/apply-stderr.log"

    if [ -f "${TERRAFORM_DIR}/plan-resource-changes.json" ]; then
        log_info "Terraform apply completed successfully."
    else
        log_error "Terraform apply may have failed. Check logs."
        exit 1
    fi
}

handle_manual_changes() {
    local manual_changes_file="${TERRAFORM_DIR}/manual-changes.json"
    local manual_count
    manual_count=$(python -c "import json; d=json.load(open('${manual_changes_file}')); print(len(d))")

    if [ "${manual_count}" -eq 0 ]; then
        return 0
    fi

    log_warn "Found ${manual_count} changes requiring manual review."

    if [ "${APPROVE_ALL_CHANGES:-false}" = "true" ]; then
        log_warn "APPROVE_ALL_CHANGES=true is set. Treating manual changes as approved."
        if [ "${ALWAYS_APPLY:-false}" = "true" ]; then
            remediate_auto
        else
            log_info "Creating PR for manual changes (auto-approval)."
            create_pr "${manual_changes_file}" "feat: address terraform drift (manual review bypassed)" false
        fi
        return 0
    fi

    log_info "Creating PR for manual changes requiring review..."
    notify_manual_changes
    create_pr "${manual_changes_file}" "chore: terraform drift remediation - manual review required" false
}

create_pr() {
    local changes_file="$1"
    local pr_title="${2:-Terraform drift remediation}"
    local auto_approve="${3:-true}"
    local branch_name=""
    local remote=""

    if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
        log_warn "Python not available for PR creation. Skipping."
        return 0
    fi

    remote=$(git remote get-url origin 2>/dev/null | grep -oP '(github\.com[:/])(.+?)(\.git)?' | sed 's/.*github\.com[:/]//' | sed 's/\.git$//')
    if [ -z "${remote}" ]; then
        log_warn "Could not determine GitHub repo from git remote. Skipping PR creation."
        return 0
    fi

    if [ "${GITHUB_REPO}" != "" ]; then
        remote="${GITHUB_REPO}"
    fi

    branch_name="drift-remediation/$(date -u +%Y%m%d-%H%M%S)"

    if [ "${DRY_RUN:-}" = "true" ]; then
        log_info "[DRY RUN] Would create PR: ${pr_title}"
        log_info "[DRY RUN] Branch: ${branch_name}, Repo: ${remote}"
        return 0
    fi

    log_info "PR creation: branch=${branch_name}, repo=${remote}, title=${pr_title}"
}

main() {
    log_info "=========================================="
    log_info "Terraform Drift Remediation Pipeline"
    log_info "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log_info "=========================================="

    log_info "Validating prerequisites..."
    command -v terraform >/dev/null 2>&1 || { log_error "terraform not found"; exit 1; }
    command -v aws >/dev/null 2>&1 || { log_error "aws CLI not found"; exit 1; }
    command -v python3 >/dev/null 2>&1 || { log_error "python3 not found"; exit 1; }

    acquire_lock

    run_terraform_plan
    parse_plan
    display_plan_summary

    if [ "${DRY_RUN:-}" = "true" ]; then
        log_info "DRY RUN complete. No changes applied."
        cat "${TERRAFORM_DIR}/safe-changes.json"
        cat "${TERRAFORM_DIR}/manual-changes.json"
        exit 0
    fi

    remediate_auto
    handle_manual_changes

    log_info "=========================================="
    log_info "Drift Remediation Complete"
    log_info "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log_info "=========================================="
}

main "$@"
