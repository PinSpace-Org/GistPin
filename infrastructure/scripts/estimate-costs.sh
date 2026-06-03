#!/usr/bin/env bash
set -euo pipefail

INFRACOST_JSON="${INFRACOST_JSON:-/tmp/infracost.json}"
THRESHOLDS_FILE="${THRESHOLDS_FILE:-infrastructure/terraform/infracost.yml}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO="${REPO:-}"
PR_NUMBER="${PR_NUMBER:-}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --infracost-json) INFRACOST_JSON="$2"; shift 2 ;;
    --thresholds)     THRESHOLDS_FILE="$2"; shift 2 ;;
    --github-token)   GITHUB_TOKEN="$2"; shift 2 ;;
    --repo)           REPO="$2"; shift 2 ;;
    --pr)             PR_NUMBER="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; shift ;;
  esac
done

if [[ ! -f "${INFRACOST_JSON}" ]]; then
  log "No Infracost JSON found at ${INFRACOST_JSON} — skipping"
  exit 0
fi

# Extract total monthly cost from Infracost output
TOTAL_COST=$(jq -r '.totalMonthlyCost // .projects[].breakdown.totalMonthlyCost // 0' "${INFRACOST_JSON}" 2>/dev/null | head -1 || echo "0")

log "============================================"
log "  GistPin Cost Estimation"
log "  Estimated Monthly Cost: \$${TOTAL_COST}"
log "============================================"

if [[ -f "${THRESHOLDS_FILE}" ]]; then
  WARN_THRESHOLD=$(yq -r '.budget_thresholds.total_monthly_cost.warn // 500' "${THRESHOLDS_FILE}" 2>/dev/null || echo "500")
  ERROR_THRESHOLD=$(yq -r '.budget_thresholds.total_monthly_cost.error // 1000' "${THRESHOLDS_FILE}" 2>/dev/null || echo "1000")

  TOTAL_INT=$(jq -r '.totalMonthlyCost' "${INFRACOST_JSON}" 2>/dev/null || echo "0")
  TOTAL_INT=${TOTAL_INT%.*}

  if [[ "${TOTAL_INT}" -gt "${ERROR_THRESHOLD}" ]]; then
    log "ERROR: Estimated cost \$${TOTAL_INT}/mo exceeds error threshold \$${ERROR_THRESHOLD}/mo"
    log "This PR cannot be merged — review cost increases"

    # Comment on PR
    if [[ -n "${GITHUB_TOKEN}" && -n "${REPO}" && -n "${PR_NUMBER}" ]]; then
      curl -s -X POST "https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments" \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"body\":\":x: **Cost Check Failed**\\nEstimated monthly cost: **\\\$${TOTAL_INT}/mo** exceeds the error threshold of \\\$${ERROR_THRESHOLD}/mo.\\nPlease review infrastructure changes and optimize resources before merging.\"}" \
        > /dev/null
    fi
    exit 1

  elif [[ "${TOTAL_INT}" -gt "${WARN_THRESHOLD}" ]]; then
    log "WARNING: Estimated cost \$${TOTAL_INT}/mo exceeds warning threshold \$${WARN_THRESHOLD}/mo"

    if [[ -n "${GITHUB_TOKEN}" && -n "${REPO}" && -n "${PR_NUMBER}" ]]; then
      curl -s -X POST "https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments" \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"body\":\":warning: **Cost Warning**\\nEstimated monthly cost: **\\\$${TOTAL_INT}/mo** exceeds the warning threshold of \\\$${WARN_THRESHOLD}/mo.\\nPlease verify these cost increases are expected.\"}" \
        > /dev/null
    fi
  else
    log "OK: Estimated cost \$${TOTAL_INT}/mo is within budget"

    if [[ -n "${GITHUB_TOKEN}" && -n "${REPO}" && -n "${PR_NUMBER}" ]]; then
      curl -s -X POST "https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments" \
        -H "Authorization: token ${GITHUB_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"body\":\":white_check_mark: **Cost Check Passed**\\nEstimated monthly cost: **\\\$${TOTAL_INT}/mo**\"}" \
        > /dev/null
    fi
  fi
else
  log "No thresholds file found — cost summary only"
fi

# Print per-service breakdown
log ""
log "Service breakdown:"
if command -v jq &>/dev/null; then
  jq -r '.projects[].breakdown.resources[]? | "  \(.name // "unknown"): $\(.monthlyCost // "N/A")"' "${INFRACOST_JSON}" 2>/dev/null || log "  (breakdown unavailable)"
fi

log "Cost estimation complete"
