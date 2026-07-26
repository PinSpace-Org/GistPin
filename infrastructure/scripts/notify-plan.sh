#!/usr/bin/env bash
# notify-plan.sh — parse terraform plan output and post summary to Slack
# Usage: ./notify-plan.sh --plan-file plan.txt --channel "#infra-deploys"
set -euo pipefail

PLAN_FILE=""
SLACK_CHANNEL="${SLACK_CHANNEL:-#infra-deploys}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
PR_URL="${PR_URL:-}"
COST_ESTIMATE="${COST_ESTIMATE:-N/A}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan-file)  PLAN_FILE="$2"; shift 2 ;;
    --channel)    SLACK_CHANNEL="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ -z "${PLAN_FILE}" || ! -f "${PLAN_FILE}" ]] && { echo "ERROR: --plan-file required"; exit 1; }
[[ -z "${SLACK_WEBHOOK}" ]] && { echo "ERROR: SLACK_WEBHOOK_URL not set"; exit 1; }

# Parse plan summary line
SUMMARY=$(grep -E "^Plan:|No changes\." "${PLAN_FILE}" | tail -1 || echo "No summary found")
ADD=$(echo "${SUMMARY}"    | grep -oP '\d+(?= to add)'    || echo "0")
CHANGE=$(echo "${SUMMARY}" | grep -oP '\d+(?= to change)' || echo "0")
DESTROY=$(echo "${SUMMARY}"| grep -oP '\d+(?= to destroy)'|| echo "0")

# Choose emoji based on severity
if [[ "${DESTROY}" -gt 0 ]]; then
  ICON=":rotating_light:"
  COLOR="danger"
elif [[ "${CHANGE}" -gt 0 || "${ADD}" -gt 0 ]]; then
  ICON=":terraform:"
  COLOR="warning"
else
  ICON=":white_check_mark:"
  COLOR="good"
fi

PAYLOAD=$(cat <<JSON
{
  "channel": "${SLACK_CHANNEL}",
  "attachments": [{
    "color": "${COLOR}",
    "title": "${ICON} Terraform Plan Summary",
    "title_link": "${PR_URL}",
    "fields": [
      {"title": "Add",     "value": "${ADD}",            "short": true},
      {"title": "Change",  "value": "${CHANGE}",         "short": true},
      {"title": "Destroy", "value": "${DESTROY}",        "short": true},
      {"title": "Est. cost delta", "value": "${COST_ESTIMATE}", "short": true}
    ],
    "footer": "GistPin Infra | $(date -u +%Y-%m-%dT%H:%MZ)",
    "actions": [
      {"type": "button", "text": "View PR", "url": "${PR_URL}"},
      {"type": "button", "text": "Approve", "url": "${PR_URL}#approve"},
      {"type": "button", "text": "Reject",  "url": "${PR_URL}#close", "style": "danger"}
    ]
  }]
}
JSON
)

curl -sf -X POST -H 'Content-type: application/json' \
  --data "${PAYLOAD}" "${SLACK_WEBHOOK}"
echo "Slack notification sent."
