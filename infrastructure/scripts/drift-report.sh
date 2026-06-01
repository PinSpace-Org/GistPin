#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"  # text | json | markdown

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

latest_report() {
  ls -t "${REPORT_DIR}"/drift-*.json 2>/dev/null | head -1
}

render_text() {
  local report="$1"
  local ts tf_count k8s_count
  ts="$(jq -r '.timestamp' "${report}")"
  tf_count="$(jq '.terraform_drift | length' "${report}")"
  k8s_count="$(jq '.kubernetes_drift | length' "${report}")"

  echo "========================================"
  echo " GistPin Infrastructure Drift Report"
  echo " Generated: ${ts}"
  echo "========================================"
  echo ""
  echo "Terraform Drift (${tf_count} resource(s)):"
  if (( tf_count > 0 )); then
    jq -r '.terraform_drift[] | "  [\(.action | join(","))] \(.resource)  — \(.reason)"' "${report}"
  else
    echo "  None"
  fi
  echo ""
  echo "Kubernetes Drift (${k8s_count} resource(s)):"
  if (( k8s_count > 0 )); then
    jq -r '.kubernetes_drift[] | "  \(.kind)/\(.name) in \(.namespace)  [\(.manifest)]"' "${report}"
  else
    echo "  None"
  fi
  echo ""
  echo "Total drifted resources: $(( tf_count + k8s_count ))"
}

render_markdown() {
  local report="$1"
  local ts tf_count k8s_count
  ts="$(jq -r '.timestamp' "${report}")"
  tf_count="$(jq '.terraform_drift | length' "${report}")"
  k8s_count="$(jq '.kubernetes_drift | length' "${report}")"

  echo "# GistPin Infrastructure Drift Report"
  echo ""
  echo "**Generated:** ${ts}"
  echo ""
  echo "## Terraform Drift (${tf_count})"
  if (( tf_count > 0 )); then
    echo "| Resource | Action | Reason |"
    echo "|---|---|---|"
    jq -r '.terraform_drift[] | "| \(.resource) | \(.action | join(",")) | \(.reason) |"' "${report}"
  else
    echo "_No drift detected._"
  fi
  echo ""
  echo "## Kubernetes Drift (${k8s_count})"
  if (( k8s_count > 0 )); then
    echo "| Kind | Name | Namespace | Manifest |"
    echo "|---|---|---|---|"
    jq -r '.kubernetes_drift[] | "| \(.kind) | \(.name) | \(.namespace) | \(.manifest) |"' "${report}"
  else
    echo "_No drift detected._"
  fi
}

main() {
  local report="${1:-$(latest_report)}"

  if [[ -z "${report}" || ! -f "${report}" ]]; then
    log "No drift report found in ${REPORT_DIR}. Run detect-drift.sh first."
    exit 1
  fi

  log "Rendering report: ${report} (format: ${OUTPUT_FORMAT})"

  case "${OUTPUT_FORMAT}" in
    json)     cat "${report}" ;;
    markdown) render_markdown "${report}" ;;
    *)        render_text "${report}" ;;
  esac
}

main "$@"
