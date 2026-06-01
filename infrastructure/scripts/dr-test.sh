#!/usr/bin/env bash
set -euo pipefail

DR_REGION="${DR_REGION:-us-west-2}"
NAMESPACE="${NAMESPACE:-gistpin}"
TEST_REPORT="/tmp/dr-test-$(date +%Y%m%d-%H%M%S).txt"
PASS=0
FAIL=0

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${TEST_REPORT}"; }
pass() { log "  ✓ PASS: $*"; ((PASS++)); }
fail_check() { log "  ✗ FAIL: $*"; ((FAIL++)); }

log "=== GistPin DR Test Report ==="
log "DR Region: ${DR_REGION} | Namespace: ${NAMESPACE}"
log "Started: $(date)"

# Test 1: DR EKS cluster reachability
log "[Test 1] DR EKS cluster reachability"
aws eks describe-cluster --name gistpin-dr --region "${DR_REGION}" \
  --query 'cluster.status' --output text 2>/dev/null | grep -q "ACTIVE" \
  && pass "DR EKS cluster is ACTIVE" \
  || fail_check "DR EKS cluster not reachable"

# Test 2: RDS read replica lag
log "[Test 2] RDS replication lag"
LAG=$(aws cloudwatch get-metric-statistics \
  --region "${DR_REGION}" \
  --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=gistpin-db-dr \
  --statistics Average \
  --period 300 \
  --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-5M +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query 'Datapoints[0].Average' --output text 2>/dev/null || echo "N/A")
if [[ "${LAG}" != "N/A" ]] && (( $(echo "${LAG} < 60" | bc -l 2>/dev/null || echo 0) )); then
  pass "RDS replica lag: ${LAG}s (< 60s)"
else
  fail_check "RDS replica lag: ${LAG}s (target < 60s)"
fi

# Test 3: S3 cross-region replication
log "[Test 3] S3 cross-region replication"
TEST_KEY="dr-test/probe-$(date +%s).txt"
aws s3 cp - "s3://gistpin-backups/${TEST_KEY}" <<< "dr-probe" 2>/dev/null \
  && sleep 5 \
  && aws s3 ls "s3://gistpin-backups-dr/${TEST_KEY}" --region "${DR_REGION}" 2>/dev/null \
  && pass "S3 cross-region replication working" \
  || fail_check "S3 cross-region replication not verified"
aws s3 rm "s3://gistpin-backups/${TEST_KEY}" 2>/dev/null || true

# Test 4: DR workload pod readiness
log "[Test 4] DR workload pod readiness"
DR_CONTEXT="arn:aws:eks:${DR_REGION}:$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo '000000000000'):cluster/gistpin-dr"
READY=$(kubectl --context "${DR_CONTEXT}" -n "${NAMESPACE}" \
  get pods --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l || echo 0)
if (( READY >= 2 )); then
  pass "DR pods running: ${READY}"
else
  fail_check "DR pods running: ${READY} (expected >= 2)"
fi

# Test 5: Backup restore smoke test
log "[Test 5] Latest backup availability"
LATEST_BACKUP=$(aws s3 ls "s3://gistpin-backups/db/" --region "${DR_REGION}" 2>/dev/null \
  | sort | tail -1 | awk '{print $4}' || echo "")
if [[ -n "${LATEST_BACKUP}" ]]; then
  pass "Latest backup found: ${LATEST_BACKUP}"
else
  fail_check "No backups found in DR bucket"
fi

# Summary
log ""
log "=== DR Test Summary ==="
log "PASSED: ${PASS} | FAILED: ${FAIL}"
log "Report: ${TEST_REPORT}"

if (( FAIL > 0 )); then
  log "DR readiness: DEGRADED — review failures above"
  exit 1
else
  log "DR readiness: HEALTHY ✓"
fi
