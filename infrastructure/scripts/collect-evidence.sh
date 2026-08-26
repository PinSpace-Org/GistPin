#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

EVIDENCE_DIR="${EVIDENCE_DIR:-infrastructure/ci/evidence}"
FRAMEWORK="${FRAMEWORK:-soc2}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
RETENTION_DAYS="${RETENTION_DAYS:-2555}"

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

Automated compliance evidence collection for audits.

Options:
  -f, --framework FRAMEWORK  Compliance framework (soc2, cis, pci)
  -d, --evidence-dir DIR     Evidence output directory
  -r, --retention DAYS        Evidence retention days
  --slack-webhook URL         Slack webhook for notifications
  -h, --help                  Show this help message

Frameworks:
  soc2  - SOC 2 Type II controls
  cis   - CIS Benchmark
  pci   - PCI DSS
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--framework) FRAMEWORK="$2"; shift 2 ;;
    -d|--evidence-dir) EVIDENCE_DIR="$2"; shift 2 ;;
    -r|--retention) RETENTION_DAYS="$2"; shift 2 ;;
    --slack-webhook) SLACK_WEBHOOK="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
EVIDENCE_BASE="${EVIDENCE_DIR}/${FRAMEWORK}/${TIMESTAMP}"

mkdir -p "${EVIDENCE_BASE}"

collect_network_evidence() {
  log "Collecting network security evidence..."
  local dir="${EVIDENCE_BASE}/network"
  mkdir -p "$dir"

  if command -v kubectl >/dev/null 2>&1; then
    kubectl get networkpolicies --all-namespaces -o yaml > "${dir}/network-policies.yaml" 2>/dev/null || true
    kubectl get ingress --all-namespaces -o yaml > "${dir}/ingress-rules.yaml" 2>/dev/null || true
    kubectl get services --all-namespaces -o yaml > "${dir}/services.yaml" 2>/dev/null || true
  fi

  if [[ -f "infrastructure/terraform/security-groups.tf" ]]; then
    cp "infrastructure/terraform/security-groups.tf" "${dir}/"
  fi

  if [[ -f "infrastructure/terraform/waf.tf" ]]; then
    cp "infrastructure/terraform/waf.tf" "${dir}/"
  fi

  success "Network evidence collected"
}

collect_iam_evidence() {
  log "Collecting IAM evidence..."
  local dir="${EVIDENCE_BASE}/iam"
  mkdir -p "$dir"

  if command -v aws >/dev/null 2>&1; then
    aws iam get-account-authorization-details > "${dir}/iam-details.json" 2>/dev/null || true
    aws iam list-policies --scope Local > "${dir}/local-policies.json" 2>/dev/null || true
    aws iam list-roles > "${dir}/roles.json" 2>/dev/null || true
    aws iam list-users > "${dir}/users.json" 2>/dev/null || true
  fi

  if command -v kubectl >/dev/null 2>&1; then
    kubectl get serviceaccounts --all-namespaces -o yaml > "${dir}/service-accounts.yaml" 2>/dev/null || true
    kubectl get clusterrolebindings -o yaml > "${dir}/cluster-role-bindings.yaml" 2>/dev/null || true
    kubectl get rolebindings --all-namespaces -o yaml > "${dir}/role-bindings.yaml" 2>/dev/null || true
  fi

  success "IAM evidence collected"
}

collect_encryption_evidence() {
  log "Collecting encryption evidence..."
  local dir="${EVIDENCE_BASE}/encryption"
  mkdir -p "$dir"

  if command -v aws >/dev/null 2>&1; then
    aws kms list-keys > "${dir}/kms-keys.json" 2>/dev/null || true
    aws s3api list-buckets --query 'Buckets[].Name' --output text > "${dir}/s3-buckets.txt" 2>/dev/null || true
  fi

  if command -v kubectl >/dev/null 2>&1; then
    kubectl get secrets --all-namespaces -o yaml > "${dir}/secrets.yaml" 2>/dev/null || true
  fi

  if [[ -f "infrastructure/terraform/ssl-certificates.tf" ]]; then
    cp "infrastructure/terraform/ssl-certificates.tf" "${dir}/"
  fi

  success "Encryption evidence collected"
}

collect_monitoring_evidence() {
  log "Collecting monitoring evidence..."
  local dir="${EVIDENCE_BASE}/monitoring"
  mkdir -p "$dir"

  if command -v aws >/dev/null 2>&1; then
    aws cloudtrail describe-trails > "${dir}/cloudtrail-trails.json" 2>/dev/null || true
    aws guardduty list-detectors > "${dir}/guardduty-detectors.json" 2>/dev/null || true
    aws configservice describe-config-rules > "${dir}/config-rules.json" 2>/dev/null || true
  fi

  if [[ -f "infrastructure/monitoring/alert-rules.yml" ]]; then
    cp "infrastructure/monitoring/alert-rules.yml" "${dir}/"
  fi

  if [[ -f "infrastructure/monitoring/prometheus.yml" ]]; then
    cp "infrastructure/monitoring/prometheus.yml" "${dir}/"
  fi

  success "Monitoring evidence collected"
}

collect_logging_evidence() {
  log "Collecting logging evidence..."
  local dir="${EVIDENCE_BASE}/logging"
  mkdir -p "$dir"

  if command -v aws >/dev/null 2>&1; then
    aws logs describe-log-groups --limit 50 > "${dir}/log-groups.json" 2>/dev/null || true
  fi

  if command -v kubectl >/dev/null 2>&1; then
    kubectl get events --all-namespaces --sort-by='.lastTimestamp' -o yaml > "${dir}/k8s-events.yaml" 2>/dev/null || true
  fi

  if [[ -f "infrastructure/monitoring/fluentd.conf" ]]; then
    cp "infrastructure/monitoring/fluentd.conf" "${dir}/"
  fi

  success "Logging evidence collected"
}

collect_configuration_evidence() {
  log "Collecting configuration evidence..."
  local dir="${EVIDENCE_BASE}/configuration"
  mkdir -p "$dir"

  if [[ -f "infrastructure/terraform/variables.tf" ]]; then
    cp "infrastructure/terraform/variables.tf" "${dir}/"
  fi

  if [[ -f "infrastructure/terraform/providers.tf" ]]; then
    cp "infrastructure/terraform/providers.tf" "${dir}/"
  fi

  if [[ -f "infrastructure/terraform/backend.tf" ]]; then
    cp "infrastructure/terraform/backend.tf" "${dir}/"
  fi

  if command -v kubectl >/dev/null 2>&1; then
    kubectl get configmaps --all-namespaces -o yaml > "${dir}/configmaps.yaml" 2>/dev/null || true
    kubectl get pods --all-namespaces -o yaml > "${dir}/pods.yaml" 2>/dev/null || true
    kubectl get nodes -o yaml > "${dir}/nodes.yaml" 2>/dev/null || true
  fi

  success "Configuration evidence collected"
}

organize_evidence() {
  log "Organizing evidence by control..."

  local manifest="${EVIDENCE_BASE}/manifest.json"

  jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg framework "$FRAMEWORK" \
    --arg retention "$RETENTION_DAYS" \
    --arg collected_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      metadata: {
        timestamp: $timestamp,
        framework: $framework,
        collected_at: $collected_at,
        retention_days: ($retention | tonumber)
      },
      controls: {
        network: { status: "collected", path: "network/" },
        iam: { status: "collected", path: "iam/" },
        encryption: { status: "collected", path: "encryption/" },
        monitoring: { status: "collected", path: "monitoring/" },
        logging: { status: "collected", path: "logging/" },
        configuration: { status: "collected", path: "configuration/" }
      },
      total_files: 0
    }' > "${manifest}"

  local file_count
  file_count=$(find "${EVIDENCE_BASE}" -type f | wc -l)
  jq --argjson count "$file_count" '.total_files = $count' "${manifest}" > "${manifest}.tmp"
  mv "${manifest}.tmp" "${manifest}"

  success "Evidence organized: ${file_count} files collected"
}

send_notification() {
  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    local file_count
    file_count=$(find "${EVIDENCE_BASE}" -type f | wc -l)

    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[Compliance] ${FRAMEWORK} evidence collected: ${file_count} files at ${EVIDENCE_BASE}\"}" >/dev/null
    log "Slack notification sent"
  fi
}

cleanup_old_evidence() {
  log "Cleaning up evidence older than ${RETENTION_DAYS} days..."

  local deleted=0
  while IFS= read -r old_dir; do
    rm -rf "$old_dir"
    deleted=$((deleted + 1))
  done < <(find "${EVIDENCE_DIR}/${FRAMEWORK}" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" 2>/dev/null)

  if [[ $deleted -gt 0 ]]; then
    log "Cleaned up ${deleted} old evidence directories"
  fi
}

main() {
  log "Starting compliance evidence collection"
  log "Framework: ${FRAMEWORK}"
  log "Evidence directory: ${EVIDENCE_BASE}"

  collect_network_evidence
  collect_iam_evidence
  collect_encryption_evidence
  collect_monitoring_evidence
  collect_logging_evidence
  collect_configuration_evidence

  organize_evidence
  send_notification
  cleanup_old_evidence

  success "Evidence collection complete: ${EVIDENCE_BASE}"
}

main "$@"
