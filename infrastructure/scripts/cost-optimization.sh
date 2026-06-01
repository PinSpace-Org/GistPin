#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
DRY_RUN="${DRY_RUN:-true}"
REPORT_FILE="/tmp/cost-optimization-$(date +%Y%m%d).txt"

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "=== GistPin Cost Optimization Report ==="
log "Region: ${AWS_REGION} | Dry-run: ${DRY_RUN}"
echo "" > "${REPORT_FILE}"

# Detect stopped EC2 instances older than 7 days
log "Checking for stopped EC2 instances..."
aws ec2 describe-instances \
  --region "${AWS_REGION}" \
  --filters "Name=instance-state-name,Values=stopped" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
  --output table | tee -a "${REPORT_FILE}"

# Detect unattached EBS volumes
log "Checking for unattached EBS volumes..."
aws ec2 describe-volumes \
  --region "${AWS_REGION}" \
  --filters "Name=status,Values=available" \
  --query 'Volumes[].[VolumeId,Size,VolumeType,CreateTime]' \
  --output table | tee -a "${REPORT_FILE}"

# Detect unused Elastic IPs
log "Checking for unused Elastic IPs..."
aws ec2 describe-addresses \
  --region "${AWS_REGION}" \
  --query 'Addresses[?AssociationId==null].[AllocationId,PublicIp]' \
  --output table | tee -a "${REPORT_FILE}"

# Detect idle RDS instances (< 5% CPU over 7 days)
log "Checking for idle RDS instances..."
aws cloudwatch get-metric-statistics \
  --region "${AWS_REGION}" \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --statistics Average \
  --period 604800 \
  --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query 'Datapoints[?Average<`5`]' \
  --output table | tee -a "${REPORT_FILE}" || true

# Right-sizing: find over-provisioned EKS nodes
log "Checking EKS node utilization..."
kubectl top nodes 2>/dev/null | tee -a "${REPORT_FILE}" || log "kubectl not available, skipping node metrics"

log "Report saved to ${REPORT_FILE}"

if [[ "${DRY_RUN}" == "false" ]]; then
  log "WARNING: Cleanup mode enabled. Review report before proceeding."
  log "To delete unattached volumes: aws ec2 delete-volume --volume-id <id>"
  log "To release unused EIPs: aws ec2 release-address --allocation-id <id>"
else
  log "Dry-run complete. Set DRY_RUN=false to enable cleanup actions."
fi
