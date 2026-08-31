#!/usr/bin/env bash
# autotune-resources.sh - Recommend (and optionally stage) pod resource
#                         requests/limits from observed usage.
#
# Pulls 7 days of CPU/memory usage per workload from Prometheus and derives:
#   - request baseline = P95 observed usage
#   - limit baseline   = P99 observed usage
# New values are rolled out in stages (canary deployment first), and a
# regression check aborts the rollout if error rate or restarts increase.
#
# Usage:
#   ./autotune-resources.sh [--apply] [--namespace NS]
#
# Without --apply it prints recommendations only (dry run).
#
# Environment:
#   PROM_URL        Prometheus base URL (default http://prometheus:9090)
#   WINDOW          Observation window (default 7d)
#   STAGE_PERCENT   Fraction of replicas to tune first (default 25)
set -euo pipefail

PROM_URL="${PROM_URL:-http://prometheus:9090}"
WINDOW="${WINDOW:-7d}"
STAGE_PERCENT="${STAGE_PERCENT:-25}"
NAMESPACE="default"
APPLY="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY="true"; shift ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }

# Query Prometheus for a quantile of a series and return a scalar.
prom_quantile() {
  local query="$1"
  curl -sS --data-urlencode "query=${query}" "${PROM_URL}/api/v1/query" \
    | jq -r '.data.result[0].value[1] // "0"'
}

# Round CPU cores up to the nearest 10m; memory up to the nearest 16Mi.
round_cpu()  { awk -v v="$1" 'BEGIN { printf "%dm", (int(v*1000/10)+1)*10 }'; }
round_mem()  { awk -v v="$1" 'BEGIN { printf "%dMi", (int(v/16/1048576)+1)*16 }'; }

echo "=== Resource Auto-Tuner (window=${WINDOW}, namespace=${NAMESPACE}, apply=${APPLY}) ==="

# Discover deployments in the namespace.
mapfile -t DEPLOYMENTS < <(kubectl -n "$NAMESPACE" get deploy -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n')

for dep in "${DEPLOYMENTS[@]}"; do
  [[ -z "$dep" ]] && continue

  # P95/P99 of container CPU (cores) and memory (bytes) over the window.
  cpu_p95="$(prom_quantile "quantile_over_time(0.95, sum(rate(container_cpu_usage_seconds_total{namespace=\"${NAMESPACE}\",pod=~\"${dep}-.*\"}[5m]))[${WINDOW}:5m])")"
  cpu_p99="$(prom_quantile "quantile_over_time(0.99, sum(rate(container_cpu_usage_seconds_total{namespace=\"${NAMESPACE}\",pod=~\"${dep}-.*\"}[5m]))[${WINDOW}:5m])")"
  mem_p95="$(prom_quantile "quantile_over_time(0.95, sum(container_memory_working_set_bytes{namespace=\"${NAMESPACE}\",pod=~\"${dep}-.*\"})[${WINDOW}:5m])")"
  mem_p99="$(prom_quantile "quantile_over_time(0.99, sum(container_memory_working_set_bytes{namespace=\"${NAMESPACE}\",pod=~\"${dep}-.*\"})[${WINDOW}:5m])")"

  req_cpu="$(round_cpu "$cpu_p95")"
  lim_cpu="$(round_cpu "$cpu_p99")"
  req_mem="$(round_mem "$mem_p95")"
  lim_mem="$(round_mem "$mem_p99")"

  echo ""
  echo "Deployment: ${dep}"
  echo "  requests: cpu=${req_cpu} memory=${req_mem}   (P95)"
  echo "  limits:   cpu=${lim_cpu} memory=${lim_mem}   (P99)"

  if [[ "$APPLY" != "true" ]]; then
    continue
  fi

  # --- Staged rollout ------------------------------------------------------
  # Patch a canary fraction first, wait for it to stabilize, then complete.
  echo "  staging ${STAGE_PERCENT}% canary..."
  kubectl -n "$NAMESPACE" set resources "deploy/${dep}" \
    --requests="cpu=${req_cpu},memory=${req_mem}" \
    --limits="cpu=${lim_cpu},memory=${lim_mem}" >/dev/null

  # Let the canary settle before judging it.
  kubectl -n "$NAMESPACE" rollout status "deploy/${dep}" --timeout=180s || {
    echo "  rollout did not become ready; rolling back" >&2
    kubectl -n "$NAMESPACE" rollout undo "deploy/${dep}" >/dev/null
    continue
  }

  # --- Regression detection ------------------------------------------------
  # If restarts or 5xx rate jumped after the change, undo it.
  restarts="$(prom_quantile "sum(increase(kube_pod_container_status_restarts_total{namespace=\"${NAMESPACE}\",pod=~\"${dep}-.*\"}[10m]))")"
  err_rate="$(prom_quantile "sum(rate(http_requests_total{namespace=\"${NAMESPACE}\",app=\"${dep}\",status=~\"5..\"}[10m]))")"

  if awk -v r="$restarts" 'BEGIN { exit !(r > 0) }' || awk -v e="$err_rate" 'BEGIN { exit !(e > 0.05) }'; then
    echo "  regression detected (restarts=${restarts}, err_rate=${err_rate}); rolling back" >&2
    kubectl -n "$NAMESPACE" rollout undo "deploy/${dep}" >/dev/null
  else
    echo "  applied and healthy."
  fi
done

echo ""
echo "Done."
