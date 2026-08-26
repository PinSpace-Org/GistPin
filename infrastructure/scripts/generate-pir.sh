#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
TEMPLATE_DIR="${TEMPLATE_DIR:-infrastructure/templates}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Automated post-incident review document generator.

Options:
  -i, --incident-id ID     Incident ID or identifier
  -s, --start-time TIME    Incident start time (ISO 8601)
  -e, --end-time TIME      Incident end time (ISO 8601)
  -o, --output DIR         Output directory
  -p, --prometheus URL     Prometheus URL
  --slack-webhook URL      Slack webhook for notifications
  -h, --help               Show this help message

Environment Variables:
  PROMETHEUS_URL           Prometheus server URL
  SLACK_WEBHOOK            Slack webhook URL
EOF
  exit 0
}

INCIDENT_ID=""
START_TIME=""
END_TIME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--incident-id) INCIDENT_ID="$2"; shift 2 ;;
    -s|--start-time) START_TIME="$2"; shift 2 ;;
    -e|--end-time) END_TIME="$2"; shift 2 ;;
    -o|--output) REPORT_DIR="$2"; shift 2 ;;
    -p|--prometheus) PROMETHEUS_URL="$2"; shift 2 ;;
    --slack-webhook) SLACK_WEBHOOK="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$INCIDENT_ID" ]]; then
  INCIDENT_ID="INC-$(date -u +%Y%m%d-%H%M%S)"
fi

if [[ -z "$START_TIME" ]]; then
  START_TIME="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)"
fi

if [[ -z "$END_TIME" ]]; then
  END_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

mkdir -p "${REPORT_DIR}"

extract_timeline() {
  log "Extracting incident timeline..."
  local timeline="[]"

  if command -v kubectl >/dev/null 2>&1; then
    local events
    events=$(kubectl get events -n gistpin --field-selector type=Warning \
      --sort-by='.lastTimestamp' -o json 2>/dev/null | \
      jq '[.items[] | select(.lastTimestamp >= "'"$START_TIME"'") | {
        time: .lastTimestamp,
        reason: .reason,
        message: .message,
        involvedObject: .involvedObject.name,
        namespace: .involvedObject.namespace
      }]' 2>/dev/null || echo "[]")

    timeline="$events"
  fi

  echo "$timeline"
}

identify_affected_services() {
  log "Identifying affected services..."
  local services="[]"

  if command -v kubectl >/dev/null 2>&1; then
    local pods
    pods=$(kubectl get pods -n gistpin -o json 2>/dev/null | \
      jq '[.items[] | select(.status.conditions[]? | select(.type=="Ready" and .status=="False")) | {
        name: .metadata.name,
        namespace: .metadata.namespace,
        status: .status.phase,
        restartCount: (.status.containerStatuses[0].restartCount // 0)
      }]' 2>/dev/null || echo "[]")

    services="$pods"
  fi

  echo "$services"
}

collect_impact_metrics() {
  log "Collecting impact metrics..."
  local metrics="{}"

  if command -v curl >/dev/null 2>&1; then
    local error_rate
    error_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
      --data-urlencode "query=sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100" \
      2>/dev/null | jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")

    local latency_p99
    latency_p99=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
      --data-urlencode "query=histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" \
      2>/dev/null | jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")

    local pod_restarts
    pod_restarts=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
      --data-urlencode "query=sum(kube_pod_container_status_restarts_total{namespace=\"gistpin\"})" \
      2>/dev/null | jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")

    metrics=$(jq -n \
      --arg error_rate "$error_rate" \
      --arg latency_p99 "$latency_p99" \
      --arg pod_restarts "$pod_restarts" \
      '{error_rate: $error_rate, latency_p99_seconds: $latency_p99, pod_restarts: $pod_restarts}')
  fi

  echo "$metrics"
}

identify_contributing_factors() {
  log "Identifying contributing factors..."
  local factors="[]"

  local deploy_events
  deploy_events=$(kubectl get events -n gistpin --field-selector reason=ScalingReplicaSet \
    --sort-by='.lastTimestamp' -o json 2>/dev/null | \
    jq '[.items[] | select(.lastTimestamp >= "'"$START_TIME"'") | .message]' 2>/dev/null || echo "[]")

  if [[ "$deploy_events" != "[]" ]]; then
    factors=$(echo "$factors" | jq --argjson deploys "$deploy_events" '. + ["Recent deployment activity detected: " + ($deploys | length | tostring) + " scaling events"]')
  fi

  local node_events
  node_events=$(kubectl get events --all-namespaces --field-selector reason=NodeNotReady \
    --sort-by='.lastTimestamp' -o json 2>/dev/null | \
    jq '[.items[] | select(.lastTimestamp >= "'"$START_TIME"'") | .involvedObject.name]' 2>/dev/null || echo "[]")

  if [[ "$node_events" != "[]" ]]; then
    factors=$(echo "$factors" | jq --argjson nodes "$node_events" '. + ["Node issues detected: " + ($nodes | join(", "))]')
  fi

  echo "$factors"
}

generate_pir() {
  local incident_id="$1"
  local start_time="$2"
  local end_time="$3"

  local timeline
  timeline=$(extract_timeline)

  local affected_services
  affected_services=$(identify_affected_services)

  local impact_metrics
  impact_metrics=$(collect_impact_metrics)

  local contributing_factors
  contributing_factors=$(identify_contributing_factors)

  local duration_seconds
  duration_seconds=$(($(date -d "$end_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$end_time" +%s 2>/dev/null || echo "0") - \
    $(date -d "$start_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s 2>/dev/null || echo "0")))
  local duration_human
  if [[ $duration_seconds -ge 3600 ]]; then
    duration_human="$((duration_seconds / 3600))h $((duration_seconds % 3600 / 60))m"
  elif [[ $duration_seconds -ge 60 ]]; then
    duration_human="$((duration_seconds / 60))m $((duration_seconds % 60))s"
  else
    duration_human="${duration_seconds}s"
  fi

  local pir_file="${REPORT_DIR}/pir-${incident_id}.md"

  cat > "$pir_file" <<EOF
# Post-Incident Review: ${incident_id}

## Metadata

| Field          | Value                        |
|----------------|------------------------------|
| Incident ID    | ${incident_id}               |
| Start Time     | ${start_time}                |
| End Time       | ${end_time}                  |
| Duration       | ${duration_human}            |
| Severity       | *(To be classified)*         |
| Author         | *(To be filled)*             |
| Review Date    | $(date -u +%Y-%m-%d)         |

## Executive Summary

*(To be filled after review)*

## Incident Timeline

$(echo "$timeline" | jq -r '.[] | "- **\(.time)**: [\(.reason)] \(.message) (\(.involvedObject))"' 2>/dev/null || echo "- No timeline events captured")

## Affected Services

$(echo "$affected_services" | jq -r '.[] | "- **\(.name)** (namespace: \(.namespace), status: \(.status), restarts: \(.restartCount))"' 2>/dev/null || echo "- No affected services detected")

## Impact Metrics

| Metric | Value |
|--------|-------|
| Error Rate | $(echo "$impact_metrics" | jq -r '.error_rate // "N/A"') |
| P99 Latency | $(echo "$impact_metrics" | jq -r '.latency_p99_seconds // "N/A"')s |
| Pod Restarts | $(echo "$impact_metrics" | jq -r '.pod_restarts // "N/A"') |

## Contributing Factors

$(echo "$contributing_factors" | jq -r '.[] | "- \(. // "None detected")"' 2>/dev/null || echo "- Analysis pending")

## Root Cause

*(To be filled after investigation)*

## Resolution

*(To be filled after review)*

## Action Items

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | *(To be filled)* | | | | Pending |

## Lessons Learned

*(To be filled after review)*

## Prevention

*(To be filled after review)*
EOF

  success "Post-incident review generated: ${pir_file}"
  echo "$pir_file"
}

send_notification() {
  local pir_file="$1"
  local incident_id="$2"

  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[PIR] Post-incident review generated for ${incident_id}: ${pir_file}\"}" >/dev/null
    log "Slack notification sent"
  fi
}

main() {
  log "Generating post-incident review for: ${INCIDENT_ID}"
  log "Time range: ${START_TIME} to ${END_TIME}"

  local pir_file
  pir_file=$(generate_pir "$INCIDENT_ID" "$START_TIME" "$END_TIME")

  send_notification "$pir_file" "$INCIDENT_ID"

  success "PIR generation complete"
}

main "$@"
