#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REGION="${REGION:-us-east-1}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/audit-resources-$(date -u +%Y%m%d-%H%M%S).json"

unmanaged_resources=()

audit_s3() {
  log "Auditing S3 buckets..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_s3_bucket\.' | sed 's/.*\.//' || true)

  while IFS= read -r bucket; do
    [[ -z "${bucket}" ]] && continue
    if ! echo "${managed}" | grep -qx "${bucket}"; then
      log "UNMANAGED: s3://${bucket}"
      unmanaged_resources+=("{\"service\":\"S3\",\"resource\":\"s3://${bucket}\"}")
    fi
  done < <(aws s3api list-buckets --region "${REGION}" 2>/dev/null | jq -r '.Buckets[].Name' || true)
}

audit_ec2() {
  log "Auditing EC2 instances..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_instance\.' | sed 's/.*\.//' || true)

  while IFS= read -r instance; do
    [[ -z "${instance}" ]] && continue
    local name
    name=$(aws ec2 describe-instances --instance-ids "${instance}" --region "${REGION}" 2>/dev/null | jq -r '.Reservations[].Instances[].Tags[]? | select(.Key=="Name") | .Value // ""' || true)
    if ! echo "${managed}" | grep -qx "${name}"; then
      log "UNMANAGED: EC2 ${instance} (${name})"
      unmanaged_resources+=("{\"service\":\"EC2\",\"resource\":\"${instance}\",\"name\":\"${name}\"}")
    fi
  done < <(aws ec2 describe-instances --region "${REGION}" 2>/dev/null | jq -r '.Reservations[].Instances[].InstanceId' || true)
}

audit_iam_roles() {
  log "Auditing IAM roles..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_iam_role\.' | sed 's/.*\.//' || true)

  while IFS= read -r role; do
    [[ -z "${role}" ]] && continue
    if ! echo "${managed}" | grep -qx "${role}"; then
      log "UNMANAGED: IAM role ${role}"
      unmanaged_resources+=("{\"service\":\"IAM\",\"resource\":\"${role}\"}")
    fi
  done < <(aws iam list-roles --region "${REGION}" 2>/dev/null | jq -r '.Roles[].RoleName' || true)
}

audit_security_groups() {
  log "Auditing security groups..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_security_group\.' | sed 's/.*\.//' || true)
  local vpc_id
  vpc_id=$(terraform output -raw vpc_id 2>/dev/null || echo "")

  while IFS= read -r sg; do
    [[ -z "${sg}" ]] && continue
    local sg_id sg_name
    sg_id=$(echo "${sg}" | jq -r '.GroupId')
    sg_name=$(echo "${sg}" | jq -r '.GroupName')
    if [[ "${sg_name}" == "default" ]]; then continue; fi
    if ! echo "${managed}" | grep -qx "${sg_name}"; then
      log "UNMANAGED: SG ${sg_id} (${sg_name})"
      unmanaged_resources+=("{\"service\":\"SecurityGroup\",\"resource\":\"${sg_id}\",\"name\":\"${sg_name}\"}")
    fi
  done < <(aws ec2 describe-security-groups --region "${REGION}" 2>/dev/null | jq -c '.SecurityGroups[] | select(.VpcId == "'"${vpc_id}}"'" or .VpcId == null)' 2>/dev/null || true)
}

audit_rds() {
  log "Auditing RDS instances..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_db_instance\.' | sed 's/.*\.//' || true)

  while IFS= read -r instance; do
    [[ -z "${instance}" ]] && continue
    if ! echo "${managed}" | grep -qx "${instance}"; then
      log "UNMANAGED: RDS ${instance}"
      unmanaged_resources+=("{\"service\":\"RDS\",\"resource\":\"${instance}\"}")
    fi
  done < <(aws rds describe-db-instances --region "${REGION}" 2>/dev/null | jq -r '.DBInstances[].DBInstanceIdentifier' || true)
}

audit_elb() {
  log "Auditing load balancers..."
  local managed
  managed=$(terraform state list 2>/dev/null | grep 'aws_lb\.' | sed 's/.*\.//' || true)

  while IFS= read -r lb; do
    [[ -z "${lb}" ]] && continue
    local lb_name
    lb_name=$(echo "${lb}" | jq -r '.LoadBalancerName')
    if ! echo "${managed}" | grep -qx "${lb_name}"; then
      log "UNMANAGED: ALB ${lb_name}"
      unmanaged_resources+=("{\"service\":\"ELB\",\"resource\":\"${lb_name}\"}")
    fi
  done < <(aws elbv2 describe-load-balancers --region "${REGION}" 2>/dev/null | jq -c '.LoadBalancers[]' || true)
}

generate_report() {
  local count=${#unmanaged_resources[@]}

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg region "${REGION}" \
    --argjson unmanaged "$(printf '%s\n' "${unmanaged_resources[@]}" | jq -s '.' 2>/dev/null || echo '[]')" \
    --argjson count "${count}" \
    '{timestamp: $timestamp, region: $region, total_unmanaged: $count, resources: $unmanaged}' \
    > "${REPORT_FILE}"
  log "Audit report written to ${REPORT_FILE}"

  if [[ "${count}" -gt 0 && -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin] Resource audit: ${count} unmanaged resources found in ${REGION}.\"}" >/dev/null || true
  fi
}

main() {
  log "Starting resource audit for region: ${REGION}..."

  audit_s3
  audit_ec2
  audit_iam_roles
  audit_security_groups
  audit_rds
  audit_elb

  generate_report
  log "Resource audit completed. ${#unmanaged_resources[@]} unmanaged resources found."
}

main "$@"
