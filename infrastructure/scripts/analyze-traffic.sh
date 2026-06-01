#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

RULES_FILE="${RULES_FILE:-infrastructure/security/traffic-rules.yml}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
FLOW_LOG_GROUP="${FLOW_LOG_GROUP:-/aws/vpc/gistpin-flow-logs}"
LOOKBACK_MINUTES="${LOOKBACK_MINUTES:-60}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
alert() {
  local msg="$1"
  log "ALERT: ${msg}"
  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin Traffic Alert] ${msg}\"}" >/dev/null
  fi
}

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/traffic-$(date -u +%Y%m%d-%H%M%S).json"

# ── Fetch VPC flow logs from CloudWatch ──────────────────────────────────────

fetch_flow_logs() {
  local start_time end_time
  end_time="$(date -u +%s)000"
  start_time="$(( end_time - LOOKBACK_MINUTES * 60 * 1000 ))"

  aws logs filter-log-events \
    --region "${AWS_REGION}" \
    --log-group-name "${FLOW_LOG_GROUP}" \
    --start-time "${start_time}" \
    --end-time "${end_time}" \
    --query 'events[*].message' \
    --output json 2>/dev/null || echo "[]"
}

# ── Parse flow log records ───────────────────────────────────────────────────
# VPC flow log format: version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status

parse_flows() {
  local raw="$1"
  echo "${raw}" | jq -r '.[]' | awk '
    NR > 1 {
      printf "{\"src\":\"%s\",\"dst\":\"%s\",\"srcport\":\"%s\",\"dstport\":\"%s\",\"protocol\":\"%s\",\"packets\":%s,\"bytes\":%s,\"action\":\"%s\"}\n",
        $4,$5,$6,$7,$8,$9,$10,$13
    }
  ' | jq -s '.'
}

# ── Anomaly detection ────────────────────────────────────────────────────────

detect_anomalies() {
  local flows="$1"
  local anomalies=()

  # High packet rate from single source (>10000 packets in window = potential DDoS)
  local ddos_candidates
  ddos_candidates="$(echo "${flows}" | jq '[group_by(.src)[] | {src: .[0].src, total_packets: (map(.packets) | add)}] | map(select(.total_packets > 10000))')"
  if [[ "$(echo "${ddos_candidates}" | jq 'length')" -gt 0 ]]; then
    alert "Potential DDoS: high packet rate from $(echo "${ddos_candidates}" | jq -r '.[0].src')"
    anomalies+=("${ddos_candidates}")
  fi

  # Port scan: single source hitting >50 distinct destination ports
  local port_scans
  port_scans="$(echo "${flows}" | jq '[group_by(.src)[] | {src: .[0].src, distinct_ports: ([.[].dstport] | unique | length)}] | map(select(.distinct_ports > 50))')"
  if [[ "$(echo "${port_scans}" | jq 'length')" -gt 0 ]]; then
    alert "Port scan detected from $(echo "${port_scans}" | jq -r '.[0].src')"
    anomalies+=("${port_scans}")
  fi

  # Rejected traffic spike: >500 REJECT actions
  local reject_count
  reject_count="$(echo "${flows}" | jq '[.[] | select(.action == "REJECT")] | length')"
  if (( reject_count > 500 )); then
    alert "High rejected traffic: ${reject_count} REJECT actions in last ${LOOKBACK_MINUTES} minutes."
  fi

  if [[ ${#anomalies[@]} -gt 0 ]]; then
    IFS=,; echo "[${anomalies[*]}]"
  else
    echo "[]"
  fi
}

# ── Traffic pattern summary ──────────────────────────────────────────────────

summarize_traffic() {
  local flows="$1"
  echo "${flows}" | jq '{
    total_flows: length,
    total_bytes: ([.[].bytes] | add // 0),
    total_packets: ([.[].packets] | add // 0),
    accepted: ([.[] | select(.action == "ACCEPT")] | length),
    rejected: ([.[] | select(.action == "REJECT")] | length),
    top_sources: ([group_by(.src)[] | {src: .[0].src, flows: length}] | sort_by(-.flows) | .[0:5]),
    top_dest_ports: ([group_by(.dstport)[] | {port: .[0].dstport, flows: length}] | sort_by(-.flows) | .[0:10])
  }'
}

# ── Check against traffic rules ──────────────────────────────────────────────

check_rules() {
  local flows="$1"
  local violations=()

  if ! command -v yq >/dev/null 2>&1; then
    log "yq not available, skipping rule checks."
    echo "[]"
    return
  fi

  local rule_count
  rule_count="$(yq '.rules | length' "${RULES_FILE}" 2>/dev/null || echo 0)"

  for (( i=0; i<rule_count; i++ )); do
    local name port action
    name="$(yq ".rules[${i}].name" "${RULES_FILE}")"
    port="$(yq ".rules[${i}].port" "${RULES_FILE}")"
    action="$(yq ".rules[${i}].expected_action" "${RULES_FILE}")"

    local actual_count
    actual_count="$(echo "${flows}" | jq "[.[] | select(.dstport == \"${port}\" and .action != \"${action}\")] | length")"
    if (( actual_count > 0 )); then
      violations+=("{\"rule\":\"${name}\",\"port\":\"${port}\",\"expected\":\"${action}\",\"violations\":${actual_count}}")
      alert "Rule violation: ${name} — ${actual_count} flows on port ${port} with unexpected action."
    fi
  done

  if [[ ${#violations[@]} -gt 0 ]]; then
    IFS=,; echo "[${violations[*]}]"
  else
    echo "[]"
  fi
}

main() {
  log "Starting network traffic analysis (last ${LOOKBACK_MINUTES} minutes)..."

  local raw_logs flows summary anomalies violations

  if command -v aws >/dev/null 2>&1; then
    raw_logs="$(fetch_flow_logs)"
    flows="$(parse_flows "${raw_logs}")"
  else
    log "AWS CLI not available. Using empty flow set."
    flows="[]"
  fi

  summary="$(summarize_traffic "${flows}")"
  anomalies="$(detect_anomalies "${flows}")"
  violations="$(check_rules "${flows}")"

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson summary "${summary}" \
    --argjson anomalies "${anomalies}" \
    --argjson violations "${violations}" \
    '{timestamp:$timestamp, summary:$summary, anomalies:$anomalies, rule_violations:$violations}' \
    > "${REPORT_FILE}"

  log "Traffic report written to ${REPORT_FILE}"
  log "Summary: $(echo "${summary}" | jq -c '{total_flows,accepted,rejected}')"

  local anomaly_count violation_count
  anomaly_count="$(echo "${anomalies}" | jq 'length')"
  violation_count="$(echo "${violations}" | jq 'length')"

  if (( anomaly_count + violation_count > 0 )); then
    log "WARNING: ${anomaly_count} anomaly group(s), ${violation_count} rule violation(s) detected."
    exit 1
  fi

  log "Traffic analysis complete. No issues detected."
  exit 0
}

main "$@"
