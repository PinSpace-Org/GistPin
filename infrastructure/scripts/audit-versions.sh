#!/usr/bin/env bash
# audit-versions.sh - Audit Kubernetes resource version pinning.
# Scans infrastructure/k8s for unpinned image tags (:latest), unversioned Helm
# chart references, and non-apps/v1 / unpinned API versions. Exits nonzero on
# violations, supports an allowlist and --fix / --report modes.
# Usage: audit-versions.sh [--allowlist FILE] [--fix] [--report] [--dir PATH]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
K8S_DIR="${K8S_DIR:-infrastructure/k8s}"
ALLOWLIST_FILE="${ALLOWLIST_FILE:-}"
FIX="${FIX:-false}"
WRITE_REPORT="${WRITE_REPORT:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()    { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
err()    { log "${RED}${*}${NC}"; }
ok()     { log "${GREEN}${*}${NC}"; }
warn()   { log "${YELLOW}${*}${NC}"; }

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Audit Kubernetes resources for version pinning violations:

  * image tags using ':latest' or no tag
  * Helm chart references without a pinned version or appVersion
  * API versions that are not stable / apps/v1

Options:
  --allowlist FILE   Path to an allowlist (one violation signature per line)
  --fix              Rewrite ':latest' / ':.*' to ':stable' in place
  --report           Write a JSON report to \$REPORT_DIR
  --dir PATH         Directory to audit (default: infrastructure/k8s)
  -h, --help         Show this help message

Environment Variables:
  REPORT_DIR         Directory for the JSON report
  K8S_DIR            Directory to audit

Examples:
  $0
  $0 --report
  $0 --allowlist infrastructure/ci/version-allowlist.txt
  $0 --fix --report
  $0 --dir infrastructure/k8s/flagagger
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allowlist)     ALLOWLIST_FILE="$2"; shift 2 ;;
    --fix)           FIX="true"; shift ;;
    --report)        WRITE_REPORT="true"; shift ;;
    --dir)           K8S_DIR="$2"; shift 2 ;;
    -h|--help)       usage ;;
    *)               err "Unknown option: $1"; usage ;;
  esac
done

[[ -d "${K8S_DIR}" ]] || { err "Audit directory not found: ${K8S_DIR}"; exit 1; }

mkdir -p "${REPORT_DIR}"

# is_allowed: a signature is allowed if the allowlist file contains it as a
# non-comment, line-exact match (portable across bash 3.2/5 — no assoc arrays).
is_allowed() {
  local sig="$1"
  [[ -z "${ALLOWLIST_FILE}" || ! -f "${ALLOWLIST_FILE}" ]] && return 1
  grep -qxF -- "${sig}" "${ALLOWLIST_FILE}"
}
log "Allowlist: ${ALLOWLIST_FILE:-none}"

violations=()

# Fixed regexes reused across all YAML scans.
IMAGES=$(find "${K8S_DIR}" -type f \( -name '*.yaml' -o -name '*.yml' \) 2>/dev/null)
CHARTS=$(find "${K8S_DIR}" -type f \( -name 'Chart.yaml' -o -name 'values.yaml' -o -name '*.yaml' -o -name '*.yml' \) 2>/dev/null)

scan_images() {
  log "Scanning for unpinned image tags..."
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      # Match image: repo[:tag]
      if [[ "${line}" =~ image:[[:space:]]*([^[:space:]]+) ]]; then
        local img="${BASH_REMATCH[1]}"
        # Unpinned if :latest, or if central : (no tag after last :).
        if [[ "${img}" =~ :latest$ ]] || ! [[ "${img}" =~ :[^/]+$ ]]; then
          local sig="${file}:${line}"
          if is_allowed "${sig}" || is_allowed "${img}"; then
            log "ALLOWED: ${sig}"
            continue
          fi
          violations+=("{\"type\":\"image\",\"file\":\"${file}\",\"detail\":\"${line}\"}")
          err "UNPINNED IMAGE: ${file} :: ${line}"
          if [[ "${FIX}" == "true" ]]; then
            sed -i '' 's/:latest/:stable/g' "${file}" 2>/dev/null || \
              sed -i 's/:latest/:stable/g' "${file}"
            warn "  -> rewritten to :stable"
          fi
        fi
      fi
    done < "${file}"
  done <<< "${IMAGES}"
}

scan_helm() {
  log "Scanning for unversioned Helm references..."
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue

    # Chart.yaml with no version / appVersion.
    if [[ "$(basename "${file}")" == "Chart.yaml" ]]; then
      if ! grep -qE '^[[:space:]]*version:' "${file}"; then
        local sig="${file}:no-version"
        if ! is_allowed "${sig}"; then
          violations+=("{\"type\":\"helm\",\"file\":\"${file}\",\"detail\":\"Chart.yaml missing version\"}")
          err "UNVERSIONED HELM CHART: ${file}"
        fi
      fi
      continue
    fi

    # HelmRelease / Helm chart spec with version: "..." only (no pinned x.y.z).
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      if [[ "${line}" == *version:* ]]; then
        # Extract the value after 'version:' stripping quotes/spaces.
        local v
        v="$(echo "${line}" | sed -E 's/.*version:[[:space:]]*["'\'' ]*([A-Za-z0-9._-]+).*/\1/')"
        # Accept only fully-pinned semver (x.y.z); reject ranges like "1.x" or "*".
        if ! [[ "${v}" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
          local sig="${file}:${line}"
          if is_allowed "${sig}" || is_allowed "${v}"; then
            continue
          fi
          violations+=("{\"type\":\"helm\",\"file\":\"${file}\",\"detail\":\"${line}\"}")
          err "UNPINNED HELM VERSION: ${file} :: ${line}"
        fi
      fi
    done < "${file}"
  done <<< "${CHARTS}"
}

scan_api_versions() {
  log "Scanning for unpinned / non-standard API versions..."
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    while IFS= read -r line; do
      [[ -z "${line}" ]] && continue
      if [[ "${line}" =~ ^[[:space:]]*apiVersion:[[:space:]]*(.+)$ ]]; then
        local av="${BASH_REMATCH[1]}"
        # Accept stable versions without alpha/beta and apps/v1.
        if [[ "${av}" =~ v[0-9]+(alpha|beta)[0-9]+$ ]] || [[ "${av}" =~ alpha|beta ]]; then
          local sig="${file}:${line}"
          if is_allowed "${sig}" || is_allowed "${av}"; then
            continue
          fi
          violations+=("{\"type\":\"apiVersion\",\"file\":\"${file}\",\"detail\":\"${line}\"}")
          err "UNPINNED API VERSION: ${file} :: ${line}"
        fi
      fi
    done < "${file}"
  done <<< "${IMAGES}"
}

generate_report() {
  local count=${#violations[@]}
  local report_file="${REPORT_DIR}/version-pinning-$(date -u +%Y%m%d-%H%M%S).json"
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg dir "${K8S_DIR}" \
    --argjson violations "$(printf '%s\n' "${violations[@]}" | jq -s '.' 2>/dev/null || echo '[]')" \
    --argjson count "${count}" \
    '{timestamp: $timestamp, dir: $dir, total_violations: $count, violations: $violations}' \
    > "${report_file}"
  log "Version pinning report written to ${report_file}"
}

main() {
  log "Auditing resource version pinning under ${K8S_DIR}..."

  scan_images
  scan_helm
  scan_api_versions

  if [[ "${WRITE_REPORT}" == "true" ]]; then
    generate_report
  fi

  if [[ ${#violations[@]} -gt 0 ]]; then
    err "VERSION PINNING AUDIT FAILED: ${#violations[@]} violation(s) found."
    exit 1
  fi

  ok "Version pinning audit passed — all resources are pinned."
  exit 0
}

main "$@"
