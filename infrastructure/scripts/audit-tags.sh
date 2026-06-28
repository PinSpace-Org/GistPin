#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
REQUIRED_TAGS="${REQUIRED_TAGS:-Environment,Owner,CostCenter,Project}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/tag-audit-$(date -u +%Y%m%d-%H%M%S).json"

IFS=',' read -ra TAG_ARRAY <<< "${REQUIRED_TAGS}"

audit_resources() {
  local service="$1"
  local region="${2:-us-east-1}"
  log "Auditing ${service} resources for required tags..."

  local non_compliant=()

  case "${service}" in
    s3)
      while IFS= read -r bucket; do
        [[ -z "${bucket}" ]] && continue
        local tags
        tags=$(aws s3api get-bucket-tagging --bucket "${bucket}" --region "${region}" 2>/dev/null | jq -r '.TagSet[].Key' || true)
        local missing_tags=""
        for tag in "${TAG_ARRAY[@]}"; do
          if ! echo "${tags}" | grep -qx "${tag}"; then
            missing_tags="${missing_tags} ${tag}"
          fi
        done
        if [[ -n "${missing_tags}" ]]; then
          log "NON-COMPLIANT: s3://${bucket} missing tags:${missing_tags}"
          non_compliant+=("{\"resource\":\"s3://${bucket}\",\"missing_tags\":\"${missing_tags}\"}")
        fi
      done < <(aws s3api list-buckets --region "${region}" 2>/dev/null | jq -r '.Buckets[].Name' || true)
      ;;
    ec2)
      while IFS= read -r instance; do
        [[ -z "${instance}" ]] && continue
        local tags
        tags=$(aws ec2 describe-tags --resources "${instance}" --region "${region}" 2>/dev/null | jq -r '.Tags[].Key' || true)
        local missing_tags=""
        for tag in "${TAG_ARRAY[@]}"; do
          if ! echo "${tags}" | grep -qx "${tag}"; then
            missing_tags="${missing_tags} ${tag}"
          fi
        done
        if [[ -n "${missing_tags}" ]]; then
          log "NON-COMPLIANT: ${instance} missing tags:${missing_tags}"
          non_compliant+=("{\"resource\":\"${instance}\",\"missing_tags\":\"${missing_tags}\"}")
        fi
      done < <(aws ec2 describe-instances --region "${region}" 2>/dev/null | jq -r '.Reservations[].Instances[].InstanceId' || true)
      ;;
    all)
      audit_resources "s3" "${region}"
      audit_resources "ec2" "${region}"
      ;;
  esac

  if [[ ${#non_compliant[@]} -gt 0 ]]; then
    printf "[%s]" "$(IFS=,; echo "${non_compliant[*]}")"
  else
    echo "[]"
  fi
}

generate_report() {
  local non_compliant_json="$1"
  local count
  count=$(echo "${non_compliant_json}" | jq 'length' 2>/dev/null || echo "0")

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson non_compliant "${non_compliant_json}" \
    --argjson count "${count}" \
    '{timestamp: $timestamp, total_non_compliant: $count, resources: $non_compliant}' \
    > "${REPORT_FILE}"
  log "Audit report written to ${REPORT_FILE}"

  if [[ "${count}" -gt 0 && -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin] Tag audit: ${count} non-compliant resources found.\"}" >/dev/null || true
  fi
}

main() {
  log "Starting tag compliance audit..."

  local non_compliant
  non_compliant="$(audit_resources "all" "${AWS_REGION:-us-east-1}")"

  generate_report "${non_compliant}"
  log "Tag audit completed."
}

main "$@"
