#!/usr/bin/env bash
set -euo pipefail

# Track system resilience score based on chaos experiment results.
#
# Usage:
#   ./chaos-score.sh [--calculate] [--history SERVICE] [--trend SERVICE] [--report]
#
# Environment variables:
#   CHAOS_RESULTS_DIR     — Directory with chaos experiment results (default: /tmp/chaos-results)
#   SCORE_HISTORY_FILE    — Path to score history (default: /tmp/chaos-score-history.json)
#   CHAOS_EXPERIMENTS     — Space-separated list of experiment types (default: "pod-failure network-latency resource-exhaustion failover")
#   SLACK_WEBHOOK         — Slack webhook for score notifications
#   SCORE_CRITICAL        — Score below this triggers critical alert (default: 40)
#   SCORE_WARNING         — Score below this triggers warning alert (default: 70)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHAOS_RESULTS_DIR="${CHAOS_RESULTS_DIR:-/tmp/chaos-results}"
SCORE_HISTORY_FILE="${SCORE_HISTORY_FILE:-/tmp/chaos-score-history.json}"
CHAOS_EXPERIMENTS="${CHAOS_EXPERIMENTS:-pod-failure network-latency resource-exhaustion failover}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
SCORE_CRITICAL="${SCORE_CRITICAL:-40}"
SCORE_WARNING="${SCORE_WARNING:-70}"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

err() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $*" >&2
}

send_alert() {
  local severity="$1"
  local message="$2"

  if [[ -z "${SLACK_WEBHOOK}" ]]; then
    log "ALERT (${severity}): ${message}"
    return
  fi

  local emoji=":white_check_mark:"
  [[ "${severity}" == "warning" ]] && emoji=":warning:"
  [[ "${severity}" == "critical" ]] && emoji=":rotating_light:"

  curl -sS -X POST -H 'Content-Type: application/json' \
    -d "{\"text\": \"${emoji} *Chaos Score Alert (${severity})*\n${message}\"}" \
    "${SLACK_WEBHOOK}" >/dev/null 2>&1 || err "Failed to send Slack alert"
}

# ---------------------------------------------------------------------------
# Score Calculation
# ---------------------------------------------------------------------------

calculate_service_score() {
  local service="$1"
  local total=0
  local count=0

  for experiment in ${CHAOS_EXPERIMENTS}; do
    local result_file="${CHAOS_RESULTS_DIR}/${service}/${experiment}.json"
    if [[ -f "${result_file}" ]]; then
      local passed
      passed=$(jq -r '.passed // false' "${result_file}" 2>/dev/null || echo "false")
      local duration
      duration=$(jq -r '.recovery_time_seconds // 300' "${result_file}" 2>/dev/null || echo "300")

      local experiment_score=0
      if [[ "${passed}" == "true" ]]; then
        # Score: 100 if recovery < 30s, decreasing to 50 if recovery > 300s
        experiment_score=$(awk "BEGIN { s=100-(${duration}-30)*50/270; print (s < 50) ? 50 : int(s) }")
      fi

      total=$((total + experiment_score))
      count=$((count + 1))
    fi
  done

  if [[ ${count} -eq 0 ]]; then
    echo "0"
  else
    echo $((total / count))
  fi
}

calculate_overall_score() {
  local services
  services=$(find "${CHAOS_RESULTS_DIR}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null || true)

  local total=0
  local count=0

  for service in ${services}; do
    local score
    score=$(calculate_service_score "${service}")
    total=$((total + score))
    count=$((count + 1))
  done

  if [[ ${count} -eq 0 ]]; then
    echo "0"
  else
    echo $((total / count))
  fi
}

# ---------------------------------------------------------------------------
# History & Trends
# ---------------------------------------------------------------------------

append_history() {
  local overall="$1"
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  mkdir -p "$(dirname "${SCORE_HISTORY_FILE}")"

  local entry
  entry=$(jq -n \
    --arg ts "${timestamp}" \
    --argjson score "${overall}" \
    '{timestamp: $ts, overall_score: $score}')

  if [[ -f "${SCORE_HISTORY_FILE}" ]]; then
    local current
    current=$(cat "${SCORE_HISTORY_FILE}")
    echo "${current}" | jq --argjson entry "${entry}" '. + [$entry]' > "${SCORE_HISTORY_FILE}"
  else
    echo "[${entry}]" > "${SCORE_HISTORY_FILE}"
  fi

  log "Recorded score ${overall} at ${timestamp}"
}

get_trend() {
  local file="$1"
  local count="${2:-10}"

  if [[ ! -f "${file}" ]]; then
    log "No history file found at ${file}"
    return
  fi

  local recent
  recent=$(jq ".[-${count}:]" "${file}" 2>/dev/null || echo "[]")
  local len
  len=$(echo "${recent}" | jq 'length')

  if [[ "${len}" -lt 2 ]]; then
    log "Not enough data points for trend (have ${len}, need 2)"
    return
  fi

  local first_score last_score
  first_score=$(echo "${recent}" | jq '.[0].overall_score')
  last_score=$(echo "${recent}" | jq '.[-1].overall_score')

  local diff=$((last_score - first_score))
  if [[ ${diff} -gt 5 ]]; then
    log "Trend: IMPROVING (+${diff} over ${len} samples)"
  elif [[ ${diff} -lt -5 ]]; then
    log "Trend: DECLINING (${diff} over ${len} samples)"
  else
    log "Trend: STABLE (${diff} over ${len} samples)"
  fi
}

# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------

generate_report() {
  local services
  services=$(find "${CHAOS_RESULTS_DIR}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null || true)

  local report_file="/tmp/chaos-score-report-$(date +%Y-%m-%d).md"

  {
    echo "# Chaos Resilience Score Report — $(date +%Y-%m-%d)"
    echo ""
    echo "## Overall Score: $(calculate_overall_score)/100"
    echo ""
    echo "| Service | Score | Status |"
    echo "|---------|-------|--------|"

    for service in ${services}; do
      local score
      score=$(calculate_service_score "${service}")
      local status="Pass"
      [[ ${score} -lt ${SCORE_WARNING} ]] && status="Warning"
      [[ ${score} -lt ${SCORE_CRITICAL} ]] && status="Critical"
      echo "| ${service} | ${score}/100 | ${status} |"
    done

    echo ""
    echo "## Failed Experiments"
    echo ""

    for service in ${services}; do
      for experiment in ${CHAOS_EXPERIMENTS}; do
        local result_file="${CHAOS_RESULTS_DIR}/${service}/${experiment}.json"
        if [[ -f "${result_file}" ]]; then
          local passed
          passed=$(jq -r '.passed // false' "${result_file}" 2>/dev/null)
          if [[ "${passed}" != "true" ]]; then
            echo "- **${service}** — ${experiment}"
          fi
        fi
      done
    done

    echo ""
    echo "## Recommendations"
    echo ""

    for service in ${services}; do
      local score
      score=$(calculate_service_score "${service}")
      if [[ ${score} -lt ${SCORE_WARNING} ]]; then
        echo "- **${service}** (${score}/100): Review failed chaos experiments and address failure modes"
      fi
    done

    echo ""
    echo "Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "${report_file}"

  log "Report written to ${report_file}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  case "${1:-}" in
    --calculate)
      log "Calculating chaos resilience scores..."
      mkdir -p "${CHAOS_RESULTS_DIR}"

      local overall
      overall=$(calculate_overall_score)
      log "Overall resilience score: ${overall}/100"

      append_history "${overall}"

      if [[ ${overall} -lt ${SCORE_CRITICAL} ]]; then
        send_alert "critical" "Overall resilience score dropped to ${overall}/100 (critical threshold: ${SCORE_CRITICAL})"
      elif [[ ${overall} -lt ${SCORE_WARNING} ]]; then
        send_alert "warning" "Overall resilience score at ${overall}/100 (warning threshold: ${SCORE_WARNING})"
      fi
      ;;
    --history)
      get_trend "${SCORE_HISTORY_FILE}" "${2:-10}"
      ;;
    --trend)
      get_trend "${SCORE_HISTORY_FILE}" "${2:-20}"
      ;;
    --report)
      generate_report
      ;;
    *)
      echo "Usage: $0 [--calculate] [--history] [--trend] [--report]"
      echo ""
      echo "Commands:"
      echo "  --calculate    Calculate scores from experiment results"
      echo "  --history N    Show trend over last N data points"
      echo "  --trend N      Show trend over last N data points"
      echo "  --report       Generate markdown resilience report"
      exit 1
      ;;
  esac
}

main "$@"
