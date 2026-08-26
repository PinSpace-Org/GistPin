#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
K8S_DIR="${K8S_DIR:-infrastructure/k8s}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

mkdir -p "${REPORT_DIR}"

declare -A SCORES=()
TOTAL_WEIGHT=0
WEIGHTED_SUM=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Infrastructure security scorecard rating tool.

Options:
  -e, --environment ENV    Target environment (default: production)
  -r, --report-dir DIR     Report output directory
  -s, --slack-webhook URL  Slack webhook for alerts
  -h, --help               Show this help message

Environment Variables:
  ENVIRONMENT              Target environment
  REPORT_DIR               Report output directory
  SLACK_WEBHOOK            Slack webhook URL
EOF
  exit 0
}

ENVIRONMENT="${ENVIRONMENT:-production}"

while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment) ENVIRONMENT="$2"; shift 2 ;;
    -r|--report-dir) REPORT_DIR="$2"; shift 2 ;;
    -s|--slack-webhook) SLACK_WEBHOOK="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

score_network() {
  local score=0
  log "Scoring network security..."

  local network_score=0

  if [[ -f "${K8S_DIR}/network-policies/default-deny.yaml" ]]; then
    network_score=$((network_score + 20))
    success "Default deny network policy found"
  else
    warn "No default deny network policy"
  fi

  if [[ -f "${K8S_DIR}/network-policies/backend-policy.yaml" ]]; then
    network_score=$((network_score + 15))
    success "Backend network policy found"
  else
    warn "No backend network policy"
  fi

  if [[ -f "${K8S_DIR}/network-policies/dns-control.yaml" ]]; then
    network_score=$((network_score + 15))
    success "DNS control policy found"
  else
    warn "No DNS control policy"
  fi

  if [[ -f "${K8S_DIR}/network-policies/egress-allowlist.yaml" ]]; then
    network_score=$((network_score + 20))
    success "Egress allowlist found"
  else
    warn "No egress allowlist"
  fi

  if [[ -f "${K8S_DIR}/network-policies/egress-default-deny.yaml" ]]; then
    network_score=$((network_score + 15))
    success "Egress default deny found"
  else
    warn "No egress default deny"
  fi

  if [[ -f "${TERRAFORM_DIR}/waf.tf" || -f "${TERRAFORM_DIR}/wafv2-rules.tf" ]]; then
    network_score=$((network_score + 15))
    success "WAF configuration found"
  else
    warn "No WAF configuration"
  fi

  SCORES[network]="$network_score"
  TOTAL_WEIGHT=$((TOTAL_WEIGHT + 25))
  WEIGHTED_SUM=$((WEIGHTED_SUM + network_score * 25))
}

score_iam() {
  local score=0
  log "Scoring IAM security..."

  local iam_score=0

  if [[ -f "${TERRAFORM_DIR}/iam-policies.tf" ]]; then
    local star_count
    star_count=$(grep -c '"*"' "${TERRAFORM_DIR}/iam-policies.tf" 2>/dev/null || echo "0")
    if [[ "$star_count" -lt 3 ]]; then
      iam_score=$((iam_score + 25))
    else
      iam_score=$((iam_score + 10))
      warn "IAM policies may have overly broad permissions"
    fi
  fi

  if [[ -f "${TERRAFORM_DIR}/iam-roles.tf" ]]; then
    iam_score=$((iam_score + 15))
    success "IAM roles defined in Terraform"
  fi

  if [[ -f "${TERRAFORM_DIR}/irsa.tf" ]]; then
    iam_score=$((iam_score + 20))
    success "IRSA (IAM Roles for Service Accounts) configured"
  else
    warn "IRSA not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/iam-analyzer.tf" ]]; then
    iam_score=$((iam_score + 15))
    success "IAM Access Analyzer configured"
  else
    warn "IAM Access Analyzer not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/boundary-targets.tf" ]]; then
    iam_score=$((iam_score + 15))
    success "IAM Boundary targets configured"
  else
    warn "No IAM boundary targets"
  fi

  if [[ -f "${K8S_DIR}/rbac/roles.yaml" ]]; then
    iam_score=$((iam_score + 10))
    success "RBAC roles defined"
  else
    warn "No RBAC roles found"
  fi

  SCORES[iam]="$iam_score"
  TOTAL_WEIGHT=$((TOTAL_WEIGHT + 25))
  WEIGHTED_SUM=$((WEIGHTED_SUM + iam_score * 25))
}

score_encryption() {
  local score=0
  log "Scoring encryption..."

  local enc_score=0

  if [[ -f "${TERRAFORM_DIR}/secrets-manager.tf" ]]; then
    enc_score=$((enc_score + 20))
    success "Secrets Manager configured"
  else
    warn "Secrets Manager not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/secrets.tf" ]]; then
    enc_score=$((enc_score + 15))
    success "Secrets configuration found"
  fi

  if [[ -f "${TERRAFORM_DIR}/ssl-certificates.tf" ]]; then
    enc_score=$((enc_score + 20))
    success "SSL certificates configured"
  else
    warn "SSL certificates not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/s3-buckets.tf" ]]; then
    if grep -q 'encrypt' "${TERRAFORM_DIR}/s3-buckets.tf" 2>/dev/null; then
      enc_score=$((enc_score + 15))
      success "S3 encryption enabled"
    else
      warn "S3 encryption may not be enabled"
    fi
  fi

  if [[ -f "${TERRAFORM_DIR}/state-bucket.tf" ]]; then
    if grep -q 'encrypt' "${TERRAFORM_DIR}/state-bucket.tf" 2>/dev/null; then
      enc_score=$((enc_score + 15))
      success "State bucket encryption enabled"
    fi
  fi

  if [[ -f "${K8S_DIR}/sealed-secrets.yaml" ]]; then
    enc_score=$((enc_score + 10))
    success "Sealed Secrets configured"
  else
    warn "Sealed Secrets not configured"
  fi

  if [[ -f "${K8S_DIR}/tls-secrets.yaml" ]]; then
    enc_score=$((enc_score + 5))
    success "TLS secrets configured"
  fi

  SCORES[encryption]="$enc_score"
  TOTAL_WEIGHT=$((TOTAL_WEIGHT + 25))
  WEIGHTED_SUM=$((WEIGHTED_SUM + enc_score * 25))
}

score_monitoring() {
  local score=0
  log "Scoring monitoring and logging..."

  local mon_score=0

  if [[ -f "${TERRAFORM_DIR}/cloudwatch.tf" ]]; then
    mon_score=$((mon_score + 15))
    success "CloudWatch configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/cloudtrail.tf" ]]; then
    mon_score=$((mon_score + 20))
    success "CloudTrail configured"
  else
    warn "CloudTrail not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/guardduty.tf" ]]; then
    mon_score=$((mon_score + 20))
    success "GuardDuty configured"
  else
    warn "GuardDuty not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/siem-integration.tf" ]]; then
    mon_score=$((mon_score + 15))
    success "SIEM integration configured"
  else
    warn "SIEM integration not configured"
  fi

  if [[ -f "${TERRAFORM_DIR}/config-rules.tf" ]]; then
    mon_score=$((mon_score + 10))
    success "AWS Config rules configured"
  else
    warn "AWS Config rules not configured"
  fi

  if [[ -f "${K8S_DIR}/falco/install.yaml" ]]; then
    mon_score=$((mon_score + 10))
    success "Falco runtime security configured"
  else
    warn "Falco not configured"
  fi

  if [[ -f "${K8S_DIR}/audit-policy.yaml" ]]; then
    mon_score=$((mon_score + 10))
    success "Audit policy configured"
  else
    warn "Audit policy not configured"
  fi

  SCORES[monitoring]="$mon_score"
  TOTAL_WEIGHT=$((TOTAL_WEIGHT + 25))
  WEIGHTED_SUM=$((WEIGHTED_SUM + mon_score * 25))
}

calculate_overall_score() {
  if [[ "$TOTAL_WEIGHT" -gt 0 ]]; then
    echo $(( WEIGHTED_SUM / TOTAL_WEIGHT ))
  else
    echo "0"
  fi
}

get_score_grade() {
  local score=$1
  if   [[ $score -ge 90 ]]; then echo "A+"
  elif [[ $score -ge 80 ]]; then echo "A"
  elif [[ $score -ge 70 ]]; then echo "B"
  elif [[ $score -ge 60 ]]; then echo "C"
  elif [[ $score -ge 50 ]]; then echo "D"
  else echo "F"
  fi
}

generate_remediation() {
  local category="$1"
  local score="$2"
  local max=100

  if [[ $score -ge 80 ]]; then
    echo "  - Maintain current posture"
    return
  fi

  case "$category" in
    network)
      [[ -z "${SCORES[network]}" ]] && return
      echo "  - Implement default deny network policies"
      echo "  - Configure egress allowlisting"
      echo "  - Deploy WAF rules"
      ;;
    iam)
      echo "  - Enable IRSA for all service accounts"
      echo "  - Configure IAM Access Analyzer"
      echo "  - Implement permission boundaries"
      ;;
    encryption)
      echo "  - Enable encryption at rest for all data stores"
      echo "  - Configure secrets management"
      echo "  - Enforce TLS for all communications"
      ;;
    monitoring)
      echo "  - Enable CloudTrail in all regions"
      echo "  - Deploy GuardDuty"
      echo "  - Configure runtime security (Falco)"
      ;;
  esac
}

generate_report() {
  local overall_score
  overall_score="$(calculate_overall_score)"
  local grade
  grade="$(get_score_grade "$overall_score")"
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local report_file="${REPORT_DIR}/security-scorecard-$(date -u +%Y%m%d-%H%M%S).json"

  log "Generating security scorecard report..."

  local network_score="${SCORES[network]:-0}"
  local iam_score="${SCORES[iam]:-0}"
  local encryption_score="${SCORES[encryption]:-0}"
  local monitoring_score="${SCORES[monitoring]:-0}"

  jq -n \
    --arg timestamp "$timestamp" \
    --arg environment "$ENVIRONMENT" \
    --arg overall_score "$overall_score" \
    --arg grade "$grade" \
    --argjson network_score "$network_score" \
    --argjson iam_score "$iam_score" \
    --argjson encryption_score "$encryption_score" \
    --argjson monitoring_score "$monitoring_score" \
    '{
      timestamp: $timestamp,
      environment: $environment,
      overall_score: ($overall_score | tonumber),
      grade: $grade,
      categories: {
        network: { score: $network_score, weight: 25 },
        iam: { score: $iam_score, weight: 25 },
        encryption: { score: $encryption_score, weight: 25 },
        monitoring: { score: $monitoring_score, weight: 25 }
      },
      remediation_priorities: []
    }' > "${report_file}"

  success "Report written to ${report_file}"

  echo ""
  echo "========================================="
  echo "  SECURITY SCORECARD - ${ENVIRONMENT}"
  echo "========================================="
  echo ""
  echo "  Overall Score: ${overall_score}/100 (Grade: ${grade})"
  echo ""
  echo "  Category Breakdown:"
  printf "    %-15s %3d/100 (weight: 25%%)\n" "Network:" "${network_score}"
  printf "    %-15s %3d/100 (weight: 25%%)\n" "IAM:" "${iam_score}"
  printf "    %-15s %3d/100 (weight: 25%%)\n" "Encryption:" "${encryption_score}"
  printf "    %-15s %3d/100 (weight: 25%%)\n" "Monitoring:" "${monitoring_score}"
  echo ""
  echo "  Remediation Priorities:"

  local -a priorities=()
  for category in network iam encryption monitoring; do
    local cat_score="${SCORES[$category]:-0}"
    if [[ $cat_score -lt 70 ]]; then
      priorities+=("${category}:${cat_score}")
    fi
  done

  IFS=$'\n' sorted=($(for p in "${priorities[@]}"; do echo "$p"; done | sort -t: -k2 -n))
  unset IFS

  if [[ ${#sorted[@]} -gt 0 ]]; then
    for entry in "${sorted[@]}"; do
      local cat="${entry%%:*}"
      echo "    [!] ${cat}"
      generate_remediation "$cat" "${entry##*:}"
    done
  else
    echo "    No critical remediation needed"
  fi

  echo ""
  echo "========================================="

  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    local slack_message
    slack_message=$(jq -n \
      --arg score "$overall_score" \
      --arg grade "$grade" \
      --arg env "$ENVIRONMENT" \
      '{text: "[Security Scorecard] Environment: \($env) | Score: \($score)/100 (Grade: \($grade))"}')
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "${slack_message}" >/dev/null
    log "Slack notification sent"
  fi

  if [[ $overall_score -lt 60 ]]; then
    return 1
  fi
  return 0
}

main() {
  log "Starting security scorecard for environment: ${ENVIRONMENT}"

  score_network
  score_iam
  score_encryption
  score_monitoring

  generate_report
}

main "$@"
