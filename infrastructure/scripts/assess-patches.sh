#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
REPORT_FILE="/tmp/patch-assessment-$(date +%Y%m%d).txt"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${REPORT_FILE}"; }

log "=== GistPin Patch Assessment ==="
log "Region: ${AWS_REGION} | Environment: ${ENVIRONMENT}"

# EC2 / EKS node patch compliance via SSM
log "[1/4] EC2 node patch compliance (SSM)"
aws ssm describe-instance-patch-states-for-patch-group \
  --patch-group "gistpin-${ENVIRONMENT}" \
  --region "${AWS_REGION}" \
  --query 'InstancePatchStates[].[InstanceId,MissingCount,InstalledCount,FailedCount,LastNoRebootInstallOperationTime]' \
  --output table 2>/dev/null | tee -a "${REPORT_FILE}" \
  || log "SSM patch data unavailable (no instances in patch group or SSM not configured)"

# Container image CVE scan via ECR
log "[2/4] ECR image vulnerability scan results"
for REPO in gistpin-backend gistpin-frontend; do
  log "  Repository: ${REPO}"
  LATEST_TAG=$(aws ecr describe-images \
    --repository-name "${REPO}" \
    --region "${AWS_REGION}" \
    --query 'sort_by(imageDetails, &imagePushedAt)[-1].imageTags[0]' \
    --output text 2>/dev/null || echo "N/A")
  if [[ "${LATEST_TAG}" != "N/A" ]]; then
    aws ecr describe-image-scan-findings \
      --repository-name "${REPO}" \
      --image-id imageTag="${LATEST_TAG}" \
      --region "${AWS_REGION}" \
      --query 'imageScanFindings.findingSeverityCounts' \
      --output table 2>/dev/null | tee -a "${REPORT_FILE}" || true
  else
    log "  No images found in ${REPO}"
  fi
done

# RDS engine version check
log "[3/4] RDS engine version and pending maintenance"
aws rds describe-db-instances \
  --region "${AWS_REGION}" \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `gistpin`)].[DBInstanceIdentifier,EngineVersion,PendingModifiedValues.EngineVersion,AutoMinorVersionUpgrade]' \
  --output table 2>/dev/null | tee -a "${REPORT_FILE}" || true

aws rds describe-pending-maintenance-actions \
  --region "${AWS_REGION}" \
  --query 'PendingMaintenanceActions[].[ResourceIdentifier,PendingMaintenanceActionDetails[0].Action,PendingMaintenanceActionDetails[0].AutoAppliedAfterDate]' \
  --output table 2>/dev/null | tee -a "${REPORT_FILE}" || true

# Node OS package check (if kubectl available)
log "[4/4] Kubernetes node OS info"
kubectl get nodes -o wide 2>/dev/null | tee -a "${REPORT_FILE}" \
  || log "kubectl not available, skipping node OS info"

log ""
log "Assessment complete. Report: ${REPORT_FILE}"
log "Review CRITICAL/HIGH CVEs and missing patches before running patch-system.sh"
