#!/usr/bin/env bash
set -euo pipefail

PRIMARY_REGION="${PRIMARY_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-us-west-2}"
NAMESPACE="${NAMESPACE:-gistpin}"
DRY_RUN="${DRY_RUN:-true}"
RTO_TARGET_MINUTES="${RTO_TARGET_MINUTES:-30}"

log() { echo "[$(date +%H:%M:%S)] $*"; }
fail() { log "ERROR: $*"; exit 1; }

START_TIME=$(date +%s)

log "=== GistPin Failover Script ==="
log "Primary: ${PRIMARY_REGION} → DR: ${DR_REGION} | Dry-run: ${DRY_RUN}"

# Step 1: Verify DR region readiness
log "[1/6] Verifying DR region readiness..."
aws eks describe-cluster --name gistpin-dr --region "${DR_REGION}" \
  --query 'cluster.status' --output text | grep -q "ACTIVE" \
  || fail "DR EKS cluster not active in ${DR_REGION}"

# Step 2: Promote RDS read replica to primary
log "[2/6] Promoting RDS read replica..."
if [[ "${DRY_RUN}" == "false" ]]; then
  aws rds promote-read-replica \
    --db-instance-identifier gistpin-db-dr \
    --region "${DR_REGION}" \
    --backup-retention-period 7
  log "Waiting for RDS promotion..."
  aws rds wait db-instance-available \
    --db-instance-identifier gistpin-db-dr \
    --region "${DR_REGION}"
else
  log "[DRY-RUN] Would promote gistpin-db-dr in ${DR_REGION}"
fi

# Step 3: Update DNS to point to DR region
log "[3/6] Updating Route53 DNS failover..."
if [[ "${DRY_RUN}" == "false" ]]; then
  HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --dns-name gistpin.io --query 'HostedZones[0].Id' --output text | cut -d/ -f3)
  aws route53 change-resource-record-sets \
    --hosted-zone-id "${HOSTED_ZONE_ID}" \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.gistpin.io",
          "Type": "A",
          "SetIdentifier": "dr-failover",
          "Failover": "PRIMARY",
          "TTL": 60,
          "ResourceRecords": [{"Value": "'"$(aws elbv2 describe-load-balancers --region ${DR_REGION} --names gistpin-alb-dr --query 'LoadBalancers[0].DNSName' --output text)"'"}]
        }
      }]
    }'
else
  log "[DRY-RUN] Would update Route53 DNS to DR ALB"
fi

# Step 4: Scale up DR workloads
log "[4/6] Scaling DR workloads..."
if [[ "${DRY_RUN}" == "false" ]]; then
  kubectl --context "arn:aws:eks:${DR_REGION}:$(aws sts get-caller-identity --query Account --output text):cluster/gistpin-dr" \
    -n "${NAMESPACE}" scale deployment backend --replicas=3
  kubectl --context "arn:aws:eks:${DR_REGION}:$(aws sts get-caller-identity --query Account --output text):cluster/gistpin-dr" \
    -n "${NAMESPACE}" scale deployment frontend --replicas=2
else
  log "[DRY-RUN] Would scale backend=3, frontend=2 in DR cluster"
fi

# Step 5: Verify DR health
log "[5/6] Verifying DR endpoint health..."
DR_URL="${DR_HEALTH_URL:-https://api-dr.gistpin.io/health}"
if [[ "${DRY_RUN}" == "false" ]]; then
  for i in {1..10}; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DR_URL}" || echo "000")
    if [[ "${HTTP_STATUS}" == "200" ]]; then
      log "DR endpoint healthy (attempt ${i})"
      break
    fi
    log "Attempt ${i}/10: status ${HTTP_STATUS}, retrying in 30s..."
    sleep 30
  done
  [[ "${HTTP_STATUS}" == "200" ]] || fail "DR endpoint not healthy after 10 attempts"
else
  log "[DRY-RUN] Would verify ${DR_URL}"
fi

# Step 6: Calculate and report RTO
END_TIME=$(date +%s)
ELAPSED_MINUTES=$(( (END_TIME - START_TIME) / 60 ))
log "[6/6] Failover complete in ${ELAPSED_MINUTES} minutes (target: ${RTO_TARGET_MINUTES}m)"

if (( ELAPSED_MINUTES > RTO_TARGET_MINUTES )); then
  log "WARNING: RTO target exceeded (${ELAPSED_MINUTES}m > ${RTO_TARGET_MINUTES}m)"
else
  log "RTO target met ✓"
fi

log "Failover to ${DR_REGION} complete. Monitor: https://grafana.gistpin.io"
