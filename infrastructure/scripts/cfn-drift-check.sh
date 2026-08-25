#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PATTERN="${STACK_PATTERN:-gistpin-*}"
AUTO_REMEDIATE="${AUTO_REMEDIATE:-false}"

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

Detect drift in CloudFormation stacks.

Options:
  -p, --pattern PATTERN  Stack name pattern (default: gistpin-*)
  -r, --region REGION    AWS region
  -R, --report-dir DIR   Report output directory
  -s, --slack-webhook    Slack webhook for alerts
  --auto-remediate       Auto-remediate drift
  -h, --help             Show this help message

Environment Variables:
  AWS_REGION             AWS region
  SLACK_WEBHOOK          Slack webhook URL
  STACK_PATTERN          CloudFormation stack pattern
  AUTO_REMEDIATE         Enable auto-remediation
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--pattern) STACK_PATTERN="$2"; shift 2 ;;
    -r|--region) AWS_REGION="$2"; shift 2 ;;
    -R|--report-dir) REPORT_DIR="$2"; shift 2 ;;
    -s|--slack-webhook) SLACK_WEBHOOK="$2"; shift 2 ;;
    --auto-remediate) AUTO_REMEDIATE="true"; shift ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

check_aws_available() {
  if ! command -v aws >/dev/null 2>&1; then
    error "AWS CLI is not installed."
    exit 1
  fi

  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    error "AWS credentials not configured."
    exit 1
  fi
}

list_stacks() {
  log "Listing CloudFormation stacks matching pattern: ${STACK_PATTERN}"
  aws cloudformation list-stacks \
    --region "${AWS_REGION}" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE \
    --query "StackSummaries[?contains(StackName, '${STACK_PATTERN%%-*}')].StackName" \
    --output text 2>/dev/null | tr '\t' '\n'
}

detect_drift() {
  local stack_name="$1"
  log "Detecting drift for stack: ${stack_name}"

  local drift_id
  drift_id=$(aws cloudformation detect-stack-drift \
    --region "${AWS_REGION}" \
    --stack-name "${stack_name}" \
    --query "StackDriftDetectionId" \
    --output text 2>/dev/null)

  if [[ -z "$drift_id" || "$drift_id" == "None" ]]; then
    warn "Could not initiate drift detection for ${stack_name}"
    return 1
  fi

  log "Drift detection initiated: ${drift_id}"

  local max_wait=120
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    local status
    status=$(aws cloudformation describe-stack-drift-detection-status \
      --region "${AWS_REGION}" \
      --stack-drift-detection-id "${drift_id}" \
      --query "DetectionStatus" \
      --output text 2>/dev/null)

    if [[ "$status" == "DETECTION_COMPLETE" ]]; then
      break
    elif [[ "$status" == "DETECTION_FAILED" ]]; then
      error "Drift detection failed for ${stack_name}"
      return 1
    fi

    sleep 5
    waited=$((waited + 5))
  done

  local drifted_count
  drifted_count=$(aws cloudformation describe-stack-drift-detection-status \
    --region "${AWS_REGION}" \
    --stack-drift-detection-id "${drift_id}" \
    --query "StackDriftStatus" \
    --output text 2>/dev/null)

  if [[ "$drifted_count" == "DRIFTED" ]]; then
    local drifted_resources
    drifted_resources=$(aws cloudformation describe-stack-resource-drifts \
      --region "${AWS_REGION}" \
      --stack-name "${stack_name}" \
      --stack-resource-drift-status-filters MODIFIED DELETED \
      --query "StackResourceDrifts[].{Resource:LogicalResourceId,Status:StackResourceDriftStatus,Type:ResourceType}" \
      --output json 2>/dev/null)

    echo "${drifted_resources}"
  else
    echo "[]"
  fi
}

generate_report() {
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local report_file="${REPORT_DIR}/cfn-drift-$(date -u +%Y%m%d-%H%M%S).json"

  mkdir -p "${REPORT_DIR}"

  local has_drift=false

  jq -n \
    --arg timestamp "$timestamp" \
    --arg region "$AWS_REGION" \
    --arg pattern "$STACK_PATTERN" \
    '{timestamp: $timestamp, region: $region, pattern: $pattern, stacks: []}' > "${report_file}"

  while IFS= read -r stack_name; do
    if [[ -z "$stack_name" ]]; then continue; fi

    local drift_data
    drift_data=$(detect_drift "$stack_name") || continue

    if [[ "$drift_data" != "[]" ]]; then
      has_drift=true
      warn "DRIFT DETECTED in stack: ${stack_name}"
      warn "Drifted resources: ${drift_data}"
    else
      success "No drift: ${stack_name}"
    fi

    local stack_entry
    stack_entry=$(jq -n \
      --arg name "$stack_name" \
      --argjson drift "$drift_data" \
      '{stack: $name, drifted_resources: $drift}')

    jq --argjson entry "$stack_entry" '.stacks += [$entry]' "${report_file}" > "${report_file}.tmp"
    mv "${report_file}.tmp" "${report_file}"

  done < <(list_stacks)

  log "Report written to ${report_file}"

  if [[ "$has_drift" == "true" ]]; then
    local drift_count
    drift_count=$(jq '[.stacks[] | select(.drifted_resources | length > 0)] | length' "${report_file}")

    if [[ -n "${SLACK_WEBHOOK}" ]]; then
      curl -s -X POST "${SLACK_WEBHOOK}" \
        -H 'Content-type: application/json' \
        --data "{\"text\":\"[CFN Drift] ${drift_count} stack(s) with drift detected. See ${report_file}\"}" >/dev/null
    fi

    if [[ "$AUTO_REMEDIATE" == "true" ]]; then
      log "Auto-remediation enabled. Review and apply corrective actions."
    fi

    return 1
  fi

  success "No drift detected across all stacks"
  return 0
}

main() {
  log "Starting CloudFormation drift detection..."
  log "Region: ${AWS_REGION}, Pattern: ${STACK_PATTERN}"

  check_aws_available
  generate_report
}

main "$@"
