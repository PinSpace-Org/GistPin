#!/usr/bin/env bash
# Automated cost optimization script
# Detects idle resources, generates right-sizing recommendations, and produces cost reports
set -euo pipefail

REPORT_DIR="${REPORT_DIR:-infrastructure/reports/cost}"
mkdir -p "${REPORT_DIR}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_FILE="${REPORT_DIR}/cost-report-${TIMESTAMP}.json"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# ── Idle resource detection ──────────────────────────────────────────────────
detect_idle_resources() {
  log "Detecting idle resources..."
  bash "$(dirname "$0")/find-idle-resources.sh" 2>/dev/null || true
}

# ── Right-sizing recommendations ─────────────────────────────────────────────
rightsizing_recommendations() {
  log "Generating right-sizing recommendations..."
  # Check k8s resource requests vs actual usage (requires kubectl + metrics-server)
  if command -v kubectl &>/dev/null; then
    kubectl top pods --all-namespaces --no-headers 2>/dev/null \
      | awk '{print $1,$2,$3,$4}' \
      | sort -k3 -rh \
      | head -20 || true
  else
    log "kubectl not available; skipping live right-sizing check"
  fi
}

# ── Reserved instance analysis ───────────────────────────────────────────────
reserved_instance_analysis() {
  log "Analysing reserved instance opportunities..."
  if command -v aws &>/dev/null; then
    aws ce get-reservation-coverage \
      --time-period Start="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)",End="$(date -u +%Y-%m-%d)" \
      --granularity MONTHLY 2>/dev/null || log "AWS CE not accessible; skipping RI analysis"
  else
    log "AWS CLI not available; skipping RI analysis"
  fi
}

# ── Spot instance automation ─────────────────────────────────────────────────
spot_instance_check() {
  log "Checking spot instance eligibility..."
  if command -v kubectl &>/dev/null; then
    kubectl get nodes -o json 2>/dev/null \
      | grep -o '"node.kubernetes.io/instance-type":"[^"]*"' \
      | sort | uniq -c || true
  fi
}

# ── Cost report generation ───────────────────────────────────────────────────
generate_report() {
  log "Writing cost report to ${REPORT_FILE}..."
  jq -n \
    --arg ts "${TIMESTAMP}" \
    --arg env "${ENVIRONMENT:-unknown}" \
    '{
      generated_at: $ts,
      environment: $env,
      sections: ["idle_resources","rightsizing","reserved_instances","spot_instances"],
      status: "completed"
    }' > "${REPORT_FILE}"
  log "Report saved: ${REPORT_FILE}"
}

detect_idle_resources
rightsizing_recommendations
reserved_instance_analysis
spot_instance_check
generate_report

log "Cost optimisation analysis complete."
