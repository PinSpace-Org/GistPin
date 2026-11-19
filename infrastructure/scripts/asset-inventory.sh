#!/usr/bin/env bash
# asset-inventory.sh — daily cloud resource discovery with compliance status
# Usage: ./asset-inventory.sh [--region us-east-1] [--output inventory.csv]
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
OUTPUT_FILE="asset-inventory-$(date +%Y%m%d).csv"
COMPLIANCE_ISSUES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2 ;;
    --output) OUTPUT_FILE="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "=== GistPin Asset Inventory — $(date -u +%Y-%m-%d) | Region: ${REGION} ==="
echo ""

# Write CSV header
echo "ResourceType,ResourceId,Name,Tagged,Compliant,Notes" > "${OUTPUT_FILE}"

check_tags() {
  local type="$1" id="$2" tags="$3"
  local required=("Environment" "Project" "Owner")
  local missing=()
  for tag in "${required[@]}"; do
    echo "${tags}" | grep -q "${tag}" || missing+=("${tag}")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    echo "true"
  else
    echo "false:missing=${missing[*]}"
    ((COMPLIANCE_ISSUES++)) || true
  fi
}

echo "--- EC2 Instances ---"
aws ec2 describe-instances \
  --region "${REGION}" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags]' \
  --output json 2>/dev/null | \
  python3 -c "
import sys,json
data=json.load(sys.stdin)
for res in data:
  for inst in res:
    iid=inst[0]
    tags={t['Key']:t['Value'] for t in (inst[1] or [])}
    name=tags.get('Name','')
    required=['Environment','Project','Owner']
    missing=[r for r in required if r not in tags]
    compliant='true' if not missing else f'false:missing={missing}'
    print(f'EC2,{iid},{name},{\"true\" if tags else \"false\"},{compliant},')
" >> "${OUTPUT_FILE}" 2>/dev/null || echo "EC2: skipped (no access)"

echo "--- S3 Buckets ---"
aws s3api list-buckets \
  --query 'Buckets[*].Name' \
  --output text 2>/dev/null | tr '\t' '\n' | while read -r bucket; do
    tags=$(aws s3api get-bucket-tagging --bucket "${bucket}" 2>/dev/null \
           | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(t['Key'] for t in d.get('TagSet',[])))" 2>/dev/null || echo "")
    tagged="true"
    [[ -z "${tags}" ]] && tagged="false"
    echo "S3,${bucket},${bucket},${tagged},${tagged},"
done >> "${OUTPUT_FILE}" 2>/dev/null || echo "S3: skipped"

echo "--- Orphaned EBS Volumes ---"
aws ec2 describe-volumes \
  --region "${REGION}" \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size]' \
  --output text 2>/dev/null | while read -r vid size; do
    echo "EBS_ORPHAN,${vid},orphaned-${size}GiB,false,false,unattached volume"
    ((COMPLIANCE_ISSUES++)) || true
done >> "${OUTPUT_FILE}" 2>/dev/null || echo "EBS: skipped"

echo ""
echo "Inventory written to: ${OUTPUT_FILE}"
echo "Compliance issues found: ${COMPLIANCE_ISSUES}"
[[ "${COMPLIANCE_ISSUES}" -gt 0 ]] && exit 1 || exit 0
