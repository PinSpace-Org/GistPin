#!/usr/bin/env bash
#
# remediate-findings.sh
#
# Ad-hoc / SSM-runnable remediation for common AWS Security Hub findings.
# Mirrors the automated logic in infrastructure/lambda/remediation/index.py
# so operators can run the same fixes manually, dry-run them, or invoke them
# via SSM Run Command outside of the EventBridge -> Lambda path.
#
# Usage:
#   ./remediate-findings.sh --list
#   ./remediate-findings.sh --finding-type s3-public-access --bucket my-bucket [--dry-run]
#   ./remediate-findings.sh --finding-type s3-encryption --bucket my-bucket [--dry-run]
#   ./remediate-findings.sh --finding-type open-security-group --sg-id sg-0123456789abcdef0 [--dry-run]
#   ./remediate-findings.sh --scan   # finds and remediates all supported ACTIVE findings automatically
#
# Requires: awscli v2, jq
set -euo pipefail

DRY_RUN=false
FINDING_TYPE=""
BUCKET=""
SG_ID=""
HIGH_RISK_PORTS=(22 3389 3306 5432 1433 27017)

usage() {
  grep '^#' "$0" | sed -e 's/^#//' -e '1d'
  exit 1
}

log() { echo "[remediate-findings] $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log "ERROR: required command '$1' not found"; exit 1; }
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --finding-type) FINDING_TYPE="$2"; shift 2 ;;
      --bucket) BUCKET="$2"; shift 2 ;;
      --sg-id) SG_ID="$2"; shift 2 ;;
      --dry-run) DRY_RUN=true; shift ;;
      --scan) FINDING_TYPE="scan"; shift ;;
      --list) FINDING_TYPE="list"; shift ;;
      -h|--help) usage ;;
      *) log "Unknown argument: $1"; usage ;;
    esac
  done
}

run() {
  if $DRY_RUN; then
    log "DRY RUN: $*"
  else
    log "Executing: $*"
    "$@"
  fi
}

fix_s3_public_access() {
  local bucket="$1"
  run aws s3api put-public-access-block \
    --bucket "$bucket" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  log "Blocked public access on s3://$bucket"
}

fix_s3_encryption() {
  local bucket="$1"
  run aws s3api put-bucket-encryption \
    --bucket "$bucket" \
    --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  log "Enabled default SSE-S3 encryption on s3://$bucket"
}

fix_open_security_group() {
  local sg_id="$1"
  local perms
  perms=$(aws ec2 describe-security-groups --group-ids "$sg_id" \
    --query 'SecurityGroups[0].IpPermissions' --output json)

  echo "$perms" | jq -c '.[]' | while read -r perm; do
    from_port=$(echo "$perm" | jq -r '.FromPort // "null"')
    has_open_range=$(echo "$perm" | jq '[.IpRanges[]? | select(.CidrIp=="0.0.0.0/0")] | length')

    if [[ "$has_open_range" -gt 0 ]]; then
      is_high_risk=false
      if [[ "$from_port" == "null" ]]; then
        is_high_risk=true
      else
        for p in "${HIGH_RISK_PORTS[@]}"; do
          [[ "$from_port" == "$p" ]] && is_high_risk=true
        done
      fi

      if $is_high_risk; then
        revoke_perm=$(echo "$perm" | jq '{IpProtocol, FromPort, ToPort, IpRanges: [.IpRanges[] | select(.CidrIp=="0.0.0.0/0")]}')
        if $DRY_RUN; then
          log "DRY RUN: would revoke ingress on $sg_id: $revoke_perm"
        else
          aws ec2 revoke-security-group-ingress --group-id "$sg_id" --ip-permissions "$revoke_perm"
          log "Revoked 0.0.0.0/0 ingress for port $from_port on $sg_id"
        fi
      fi
    fi
  done
}

list_active_findings() {
  aws securityhub get-findings \
    --filters '{"RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}],"WorkflowStatus":[{"Value":"NEW","Comparison":"EQUALS"}]}' \
    --query 'Findings[].{Id:Id,Generator:GeneratorId,Severity:Severity.Label,Title:Title}' \
    --output table
}

# --scan looks up ACTIVE findings for the supported generator IDs and applies
# the matching fix automatically, using resource identifiers from the finding.
scan_and_remediate() {
  local supported_ids='["aws-foundational-security-best-practices/v/1.0.0/S3.8","cis-aws-foundations-benchmark/v/1.4.0/2.1.1","aws-foundational-security-best-practices/v/1.0.0/EC2.19"]'

  aws securityhub get-findings \
    --filters '{"RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}],"WorkflowStatus":[{"Value":"NEW","Comparison":"EQUALS"}]}' \
    --output json |
    jq -c --argjson ids "$supported_ids" '.Findings[] | select(.GeneratorId as $g | $ids | index($g))' |
    while read -r finding; do
      generator=$(echo "$finding" | jq -r '.GeneratorId')
      case "$generator" in
        *S3.8)
          bucket=$(echo "$finding" | jq -r '.Resources[0].Id' | awk -F':::' '{print $2}')
          fix_s3_public_access "$bucket"
          ;;
        *2.1.1)
          bucket=$(echo "$finding" | jq -r '.Resources[0].Id' | awk -F':::' '{print $2}')
          fix_s3_encryption "$bucket"
          ;;
        *EC2.19)
          sg_id=$(echo "$finding" | jq -r '.Resources[0].Id' | awk -F'/' '{print $NF}')
          fix_open_security_group "$sg_id"
          ;;
      esac
    done
}

main() {
  require_cmd aws
  require_cmd jq
  parse_args "$@"

  case "$FINDING_TYPE" in
    list) list_active_findings ;;
    scan) scan_and_remediate ;;
    s3-public-access)
      [[ -z "$BUCKET" ]] && { log "ERROR: --bucket required"; usage; }
      fix_s3_public_access "$BUCKET"
      ;;
    s3-encryption)
      [[ -z "$BUCKET" ]] && { log "ERROR: --bucket required"; usage; }
      fix_s3_encryption "$BUCKET"
      ;;
    open-security-group)
      [[ -z "$SG_ID" ]] && { log "ERROR: --sg-id required"; usage; }
      fix_open_security_group "$SG_ID"
      ;;
    *)
      log "ERROR: no valid --finding-type/--scan/--list provided"
      usage
      ;;
  esac
}

main "$@"