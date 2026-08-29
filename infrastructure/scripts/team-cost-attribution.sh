#!/usr/bin/env bash
# team-cost-attribution.sh - Attribute Kubernetes resource costs to teams
# using namespace labels, and produce a showback report + per-team budget alerts.
# Usage: team-cost-attribution.sh [--namespace NS] [--cost-template FILE] [--report]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
TEAM_LABEL="${TEAM_LABEL:-team}"
COST_TEMPLATE="${COST_TEMPLATE:-infrastructure/scripts/cost-template.json}"
KUBECONFIG="${KUBECONFIG:-}"
NAMESPACE_FILTER="${NAMESPACE_FILTER:-}"
WRITE_REPORT="${WRITE_REPORT:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
info()   { log "${BLUE}INFO${NC}  $*"; }
success(){ log "${GREEN}OK${NC}    $*"; }
warn()   { log "${YELLOW}WARN${NC}  $*"; }
error()  { log "${RED}ERROR${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Attribute Kubernetes resource costs to teams using the namespace label
\`$TEAM_LABEL=<team>\`, aggregate CPU/memory and cost from a metrics source, and
produce a per-team showback report plus per-team budget alert thresholds.

Options:
  -n, --namespace NS       Only attribute namespaces with this name filter
  -c, --cost-template FILE Cost template JSON (cpu_per_core_hour, mem_per_gib_hour, budget map)
      (default: infrastructure/scripts/cost-template.json)
  -r, --report             Write a JSON report to \$REPORT_DIR
  -t, --team-label LABEL   Namespace label used for the team (default: team)
  -h, --help               Show this help message

Environment Variables:
  KUBECONFIG               Path to kubeconfig file
  REPORT_DIR               Directory for the JSON report (default: infrastructure/ci/reports)

Examples:
  $0
  $0 --report
  $0 --namespace gistpin-prod --report
  TEAM_LABEL=owner KUBECONFIG=~/.kube/prod $0 --report
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--namespace)      NAMESPACE_FILTER="$2"; shift 2 ;;
    -c|--cost-template)  COST_TEMPLATE="$2"; shift 2 ;;
    -r|--report)         WRITE_REPORT="true"; shift ;;
    -t|--team-label)     TEAM_LABEL="$2"; shift 2 ;;
    -h|--help)           usage ;;
    *)                   error "Unknown option: $1"; usage ;;
  esac
done

mkdir -p "${REPORT_DIR}"

# Default cost template when none provided by the user.
if [[ ! -f "${COST_TEMPLATE}" ]]; then
  COST_TEMPLATE="${REPO_ROOT}/infrastructure/scripts/cost-template.json"
fi

load_cost_template() {
  local file="${COST_TEMPLATE}"
  if [[ ! -f "${file}" ]]; then
    # Emit an inline default so the script is usable without a template file.
    cat <<'EOF'
{"cpu_per_core_hour":0.0301,"mem_per_gib_hour":0.0047,"budget":{"frontend":500,"backend":1200,"data":1500,"platform":800}}
EOF
    warn "Cost template not found at ${file}; using built-in defaults"
    return
  fi
  cat "${file}"
}

# Resource cost (USD/hour) from CPU cores and memory GiB using a per-unit template.
compute_cost() {
  local cpu_cores="$1"
  local mem_gib="$2"
  local cpu_price mem_price
  cpu_price="$(load_cost_template | jq -r '.cpu_per_core_hour' 2>/dev/null || echo "0.0301")"
  mem_price="$(load_cost_template | jq -r '.mem_per_gib_hour' 2>/dev/null || echo "0.0047")"

  # Use awk for float math since bash integers truncate small values.
  awk -v cpu="${cpu_cores}" -v mem="${mem_gib}" -v cp="${cpu_price}" -v mp="${mem_price}" \
    'BEGIN { printf "%.6f", (cpu * cp) + (mem * mp) }'
}

get_team_budget() {
  local team="$1"
  local budget
  budget="$(load_cost_template | jq -r --arg t "${team}" '.budget[$t] // 0' 2>/dev/null || echo "0")"
  echo "${budget}"
}

# list_teams_from_namespaces: namespace,team tuples via the label.
list_teams() {
  local ns_filter=()
  if [[ -n "${NAMESPACE_FILTER}" ]]; then
    ns_filter=(--field-selector "metadata.name=${NAMESPACE_FILTER}")
  fi

  kubectl get namespaces -o custom-columns=NAME:.metadata.name,TEAM:.metadata.labels."${TEAM_LABEL}" \
    "${ns_filter[@]}" --no-headers 2>/dev/null | awk '$2 != "<none>" && $2 != "" {print $1"\t"$2}'
}

# aggregate_namespace: pull kubectl top output for a namespace, compute cpu/mem totals.
aggregate_namespace() {
  local namespace="$1"
  # Example lines: pod/foo        100m   200Mi
  local raw
  raw="$(kubectl top pods -n "${namespace}" --no-headers 2>/dev/null || true)"

  local cpu_millis=0 mem_mib=0
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    local name cpu mem
    name="$(echo "${line}" | awk '{print $1}')"
    cpu="$(echo "${line}" | awk '{print $2}')"
    mem="$(echo "${line}" | awk '{print $3}')"
    [[ "${name}" == "POD" ]] && continue

    cpu_millis=$((cpu_millis + ${cpu%m}))
    mem_mib=$((mem_mib + ${mem%Mi} + ${mem%Gi} * 1024))
  done <<< "${raw}"

  local cpu_cores mem_gib
  cpu_cores="$(awk "BEGIN { printf \"%.4f\", ${cpu_millis} / 1000 }")"
  mem_gib="$(awk "BEGIN { printf \"%.4f\", ${mem_mib} / 1024 }")"

  echo "${cpu_cores} ${mem_gib}"
}

generate_showback() {
  info "=== Kubernetes Team Cost Attribution ==="
  info "Team label: ${TEAM_LABEL}"
  info "Namespace filter: ${NAMESPACE_FILTER:-all}"

  local team_list
  team_list="$(list_teams)"

  if [[ -z "${team_list}" ]]; then
    warn "No namespaces with a '${TEAM_LABEL}' label found."
  fi

  local report_entries=()
  local grand_total=0.0

  echo ""
  printf "%-12s %-20s %-12s %-12s %-12s %-14s %s\n" "TEAM" "NAMESPACE" "CPU(CORE)" "MEM(GiB)" "COST(USD/h)" "BUDGET" "THRESHOLD"
  echo "----------------------------------------------------------------------------------------------------"

  while IFS=$'\t' read -r namespace team; do
    [[ -z "${namespace}" ]] && continue

    local agg cpu mem cost budget pct
    agg="$(aggregate_namespace "${namespace}")"
    cpu="$(echo "${agg}" | awk '{print $1}')"
    mem="$(echo "${agg}" | awk '{print $2}')"
    cost="$(compute_cost "${cpu}" "${mem}")"
    budget="$(get_team_budget "${team}")"

    pct="100"
    if [[ "${budget}" -gt 0 ]]; then
      pct="$(awk -v c="${cost}" -v b="${budget}" 'BEGIN { printf "%.1f", (c/b)*100 }')"
    fi

    local threshold="n/a"
    if [[ "${budget}" -gt 0 ]]; then
      threshold="$(alert_threshold "${cost}" "${budget}")"
    fi

    printf "%-12s %-20s %-12s %-12s %-12s %-14s %s\n" "${team}" "${namespace}" "${cpu}" "${mem}" "${cost}" "${budget}" "${threshold}"

    report_entries+=("{\"team\":\"${team}\",\"namespace\":\"${namespace}\",\"cpu_cores\":\"${cpu}\",\"memory_gib\":\"${mem}\",\"cost_usd_hour\":\"${cost}\",\"budget_usd\":\"${budget}\",\"threshold\":\"${threshold}\"}")
    grand_total="$(awk -v a="${grand_total}" -v b="${cost}" 'BEGIN { printf "%.6f", a+b }')"
  done <<< "${team_list}"

  echo "----------------------------------------------------------------------------------------------------"
  info "Total attributed compute cost: \$${grand_total}/hour"

  if [[ "${WRITE_REPORT}" == "true" ]]; then
    local report_file="${REPORT_DIR}/team-cost-attribution-$(date -u +%Y%m%d-%H%M%S).json"
    jq -n \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg team_label "${TEAM_LABEL}" \
      --arg total "${grand_total}" \
      --argjson entries "$(printf '%s\n' "${report_entries[@]}" | jq -s '.' 2>/dev/null || echo '[]')" \
      '{timestamp: $timestamp, team_label: $team_label, total_cost_usd_hour: $total, teams: $entries}' \
      > "${report_file}"
    info "Showback report written to ${report_file}"
  fi
}

# alert_threshold: classify a team against its monthly budget (warning/critical).
alert_threshold() {
  local cost="$1"
  local budget="$2"
  local monthly
  monthly="$(awk -v c="${cost}" 'BEGIN { printf "%.2f", c * 730 }')"
  local pct
  pct="$(awk -v m="${monthly}" -v b="${budget}" 'BEGIN { printf "%.1f", (m/b)*100 }')"

  if (( $(echo "${pct} >= 100" | bc -l 2>/dev/null || echo 0) )); then
    echo "CRITICAL"      # projected monthly spend exceeds budget
  elif (( $(echo "${pct} >= 85" | bc -l 2>/dev/null || echo 0) )); then
    echo "WARNING"       # within 85-100% of budget
  else
    echo "OK"
  fi
}

main() {
  if ! command -v kubectl >/dev/null 2>&1; then
    error "kubectl is required but not available on PATH."
    exit 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    error "jq is required but not available on PATH."
    exit 1
  fi

  generate_showback
  info "Team cost attribution completed."
}

main "$@"
