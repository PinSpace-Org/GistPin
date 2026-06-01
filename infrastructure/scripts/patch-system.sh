#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-staging}"
DRY_RUN="${DRY_RUN:-true}"
NAMESPACE="${NAMESPACE:-gistpin}"
PATCH_LOG="/tmp/patch-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_SNAPSHOT=""

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${PATCH_LOG}"; }
fail() { log "ERROR: $*"; exit 1; }

log "=== GistPin Patch System ==="
log "Environment: ${ENVIRONMENT} | Dry-run: ${DRY_RUN}"

# Step 1: Run assessment first
log "[1/5] Running patch assessment..."
bash "$(dirname "$0")/assess-patches.sh" | tee -a "${PATCH_LOG}"

# Step 2: Snapshot RDS before patching
log "[2/5] Creating pre-patch RDS snapshot..."
SNAPSHOT_ID="gistpin-pre-patch-$(date +%Y%m%d-%H%M%S)"
if [[ "${DRY_RUN}" == "false" ]]; then
  aws rds create-db-snapshot \
    --db-instance-identifier "gistpin-db-${ENVIRONMENT}" \
    --db-snapshot-identifier "${SNAPSHOT_ID}" \
    --region "${AWS_REGION:-us-east-1}"
  ROLLBACK_SNAPSHOT="${SNAPSHOT_ID}"
  log "Snapshot created: ${SNAPSHOT_ID}"
else
  log "[DRY-RUN] Would create snapshot: ${SNAPSHOT_ID}"
fi

# Step 3: Staged rollout — patch one node at a time
log "[3/5] Patching EKS nodes (staged rollout)..."
NODES=$(kubectl get nodes -l "env=${ENVIRONMENT}" --no-headers -o custom-columns=NAME:.metadata.name 2>/dev/null || echo "")
if [[ -z "${NODES}" ]]; then
  log "No nodes found for env=${ENVIRONMENT}, skipping node patching"
else
  for NODE in ${NODES}; do
    log "  Patching node: ${NODE}"
    if [[ "${DRY_RUN}" == "false" ]]; then
      kubectl cordon "${NODE}"
      kubectl drain "${NODE}" --ignore-daemonsets --delete-emptydir-data --timeout=120s
      # Trigger SSM patch via AWS Systems Manager
      INSTANCE_ID=$(kubectl get node "${NODE}" -o jsonpath='{.spec.providerID}' | cut -d/ -f5)
      aws ssm send-command \
        --instance-ids "${INSTANCE_ID}" \
        --document-name "AWS-RunPatchBaseline" \
        --parameters '{"Operation":["Install"]}' \
        --region "${AWS_REGION:-us-east-1}" \
        --output text --query 'Command.CommandId'
      sleep 30
      kubectl uncordon "${NODE}"
      log "  Node ${NODE} patched and uncordoned"
    else
      log "  [DRY-RUN] Would cordon, drain, patch, uncordon ${NODE}"
    fi
  done
fi

# Step 4: Update container base images
log "[4/5] Checking container image updates..."
kubectl get pods -n "${NAMESPACE}" -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' 2>/dev/null \
  | sort -u | tee -a "${PATCH_LOG}" || log "kubectl not available"

# Step 5: Compliance report
log "[5/5] Generating compliance report..."
if [[ "${DRY_RUN}" == "false" ]]; then
  aws ssm describe-instance-patch-states-for-patch-group \
    --patch-group "gistpin-${ENVIRONMENT}" \
    --region "${AWS_REGION:-us-east-1}" \
    --query 'InstancePatchStates[].[InstanceId,PatchGroup,MissingCount,InstalledCount,FailedCount]' \
    --output table | tee -a "${PATCH_LOG}" || true
fi

log ""
log "Patch run complete. Log: ${PATCH_LOG}"
[[ -n "${ROLLBACK_SNAPSHOT}" ]] && log "Rollback snapshot: ${ROLLBACK_SNAPSHOT}"
