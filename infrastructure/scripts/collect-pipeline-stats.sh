#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${1:-PinSpace-Org}"
REPO_NAME="${2:-GistPin}"
WORKFLOW_NAME="${3:-}"
OUTPUT_FILE="infrastructure/monitoring/pipeline-stats-latest.json"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required."
  exit 1
fi

repo="${REPO_OWNER}/${REPO_NAME}"
runs_json="$(gh run list --repo "${repo}" --limit 50 --json workflowName,conclusion,startedAt,updatedAt,databaseId)"

if [[ -n "${WORKFLOW_NAME}" ]]; then
  runs_json="$(jq --arg wf "${WORKFLOW_NAME}" '[.[] | select(.workflowName == $wf)]' <<<"${runs_json}")"
fi

total_runs="$(jq 'length' <<<"${runs_json}")"
if [[ "${total_runs}" -eq 0 ]]; then
  jq -n '{total_runs:0, failed_runs:0, success_runs:0, failure_rate:0, success_rate:0, average_duration_seconds:0}' > "${OUTPUT_FILE}"
  echo "No workflow runs found."
  exit 0
fi

failed_runs="$(jq '[.[] | select(.conclusion == "failure")] | length' <<<"${runs_json}")"
success_runs="$(jq '[.[] | select(.conclusion == "success")] | length' <<<"${runs_json}")"

duration_sum="$(
  jq '[.[] | ((.updatedAt | fromdateiso8601) - (.startedAt | fromdateiso8601))] | add' <<<"${runs_json}"
)"

failure_rate="$(jq -n --argjson f "${failed_runs}" --argjson t "${total_runs}" '$f / $t')"
success_rate="$(jq -n --argjson s "${success_runs}" --argjson t "${total_runs}" '$s / $t')"
avg_duration="$(jq -n --argjson d "${duration_sum}" --argjson t "${total_runs}" '$d / $t')"

jq -n \
  --argjson total "${total_runs}" \
  --argjson failed "${failed_runs}" \
  --argjson success "${success_runs}" \
  --argjson fr "${failure_rate}" \
  --argjson sr "${success_rate}" \
  --argjson avg "${avg_duration}" \
  --arg collected_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '{
    collected_at: $collected_at,
    total_runs: $total,
    failed_runs: $failed,
    success_runs: $success,
    failure_rate: $fr,
    success_rate: $sr,
    average_duration_seconds: $avg
  }' > "${OUTPUT_FILE}"

echo "Pipeline stats written to ${OUTPUT_FILE}"
