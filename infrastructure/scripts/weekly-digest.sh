#!/usr/bin/env bash
# weekly-digest.sh — collect infra metrics and send the weekly digest
# Usage: ./weekly-digest.sh [--dry-run]
set -euo pipefail

DRY_RUN=false
REPORT_DATE=$(date -u +"%Y-%m-%d")
REPORT_FILE="/tmp/weekly-digest-${REPORT_DATE}.html"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== GistPin Infrastructure Weekly Digest — ${REPORT_DATE} ==="

# --- 1. Deployment history (last 7 days) ---
DEPLOY_COUNT=$(find /tmp/deployment-history -name "*.json" -newer <(date -d "7 days ago" +%s 2>/dev/null || date -v-7d +%s) 2>/dev/null | wc -l || echo "0")
echo "Deployments this week: ${DEPLOY_COUNT}"

# --- 2. Cost summary via AWS Cost Explorer ---
echo "Fetching cost data..."
THIS_WEEK_COST=$(aws ce get-cost-and-usage \
  --time-period "Start=$(date -u -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d),End=${REPORT_DATE}" \
  --granularity WEEKLY \
  --metrics "UnblendedCost" \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text 2>/dev/null || echo "N/A")

LAST_WEEK_COST=$(aws ce get-cost-and-usage \
  --time-period "Start=$(date -u -d '14 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-14d +%Y-%m-%d),End=$(date -u -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d)" \
  --granularity WEEKLY \
  --metrics "UnblendedCost" \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text 2>/dev/null || echo "N/A")

echo "Cost this week: \$${THIS_WEEK_COST} | last week: \$${LAST_WEEK_COST}"

# --- 3. Incident summary ---
INCIDENT_COUNT=$(aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'length(MetricAlarms)' \
  --output text 2>/dev/null || echo "0")
echo "Active alarms: ${INCIDENT_COUNT}"

# --- 4. SLO compliance ---
SLO_BREACHES=$(aws cloudwatch get-metric-statistics \
  --namespace GistPin/SLO \
  --metric-name SLOBreach \
  --start-time "$(date -u -d '7 days ago' +%FT%TZ 2>/dev/null || date -u -v-7d +%FT%TZ)" \
  --end-time "$(date -u +%FT%TZ)" \
  --period 604800 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text 2>/dev/null || echo "0")
echo "SLO breaches this week: ${SLO_BREACHES}"

# --- 5. Render HTML report ---
TEMPLATE_DIR="$(dirname "$0")"
HTML=$(sed \
  -e "s/{{REPORT_DATE}}/${REPORT_DATE}/g" \
  -e "s/{{DEPLOY_COUNT}}/${DEPLOY_COUNT}/g" \
  -e "s/{{THIS_WEEK_COST}}/${THIS_WEEK_COST}/g" \
  -e "s/{{LAST_WEEK_COST}}/${LAST_WEEK_COST}/g" \
  -e "s/{{INCIDENT_COUNT}}/${INCIDENT_COUNT}/g" \
  -e "s/{{SLO_BREACHES}}/${SLO_BREACHES}/g" \
  "${TEMPLATE_DIR}/digest-template.html")

echo "${HTML}" > "${REPORT_FILE}"
echo "Report written to ${REPORT_FILE}"

# --- 6. Email delivery ---
if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[DRY-RUN] Would send digest to ${DIGEST_RECIPIENTS:-infra-team@example.com}"
else
  aws ses send-email \
    --from "${DIGEST_FROM:-noreply@gistpin.io}" \
    --destination "ToAddresses=${DIGEST_RECIPIENTS:-infra-team@example.com}" \
    --message "Subject={Data=GistPin Infrastructure Digest ${REPORT_DATE},Charset=UTF-8},Body={Html={Data=$(cat "${REPORT_FILE}"),Charset=UTF-8}}" \
    2>/dev/null && echo "Digest sent." || echo "Email send failed (SES may not be configured)"
fi
