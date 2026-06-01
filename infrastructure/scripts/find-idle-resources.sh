#!/usr/bin/env bash
# Detect idle / underutilised cloud and k8s resources
set -euo pipefail

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

IDLE_CPU_THRESHOLD="${IDLE_CPU_THRESHOLD:-5}"   # percent
IDLE_MEM_THRESHOLD="${IDLE_MEM_THRESHOLD:-10}"  # percent

# ── Kubernetes idle pods ──────────────────────────────────────────────────────
find_idle_k8s_pods() {
  if ! command -v kubectl &>/dev/null; then
    log "kubectl not found; skipping k8s idle pod check"
    return
  fi
  log "Checking for idle k8s pods (CPU < ${IDLE_CPU_THRESHOLD}m)..."
  kubectl top pods --all-namespaces --no-headers 2>/dev/null \
    | awk -v thr="${IDLE_CPU_THRESHOLD}" '
        {
          cpu=$3; gsub(/m/,"",cpu)
          if (cpu+0 < thr+0) print "IDLE_POD", $1, $2, "cpu="$3, "mem="$4
        }' || log "metrics-server unavailable; skipping"
}

# ── Kubernetes idle deployments (0 replicas) ─────────────────────────────────
find_scaled_down_deployments() {
  if ! command -v kubectl &>/dev/null; then return; fi
  log "Checking for scaled-down deployments..."
  kubectl get deployments --all-namespaces --no-headers 2>/dev/null \
    | awk '$3 == "0" {print "SCALED_DOWN", $1, $2}' || true
}

# ── Unused PersistentVolumeClaims ────────────────────────────────────────────
find_unbound_pvcs() {
  if ! command -v kubectl &>/dev/null; then return; fi
  log "Checking for unbound PVCs..."
  kubectl get pvc --all-namespaces --no-headers 2>/dev/null \
    | awk '$3 != "Bound" {print "UNBOUND_PVC", $1, $2, "status="$3}' || true
}

# ── AWS idle EC2 instances ────────────────────────────────────────────────────
find_idle_ec2() {
  if ! command -v aws &>/dev/null; then
    log "AWS CLI not found; skipping EC2 idle check"
    return
  fi
  log "Checking for idle EC2 instances (CPU < ${IDLE_CPU_THRESHOLD}%)..."
  aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --statistics Average \
    --period 86400 \
    --start-time "$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    2>/dev/null | jq -r '.Datapoints[] | select(.Average < '"${IDLE_CPU_THRESHOLD}"') | "IDLE_EC2 avg_cpu=\(.Average)"' || true
}

find_idle_k8s_pods
find_scaled_down_deployments
find_unbound_pvcs
find_idle_ec2

log "Idle resource scan complete."
