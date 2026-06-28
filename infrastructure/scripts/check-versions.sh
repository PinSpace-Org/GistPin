#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
CURRENT_TF_VERSION="${CURRENT_TF_VERSION:-1.7.5}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/versions-$(date -u +%Y%m%d-%H%M%S).json"

check_terraform_version() {
  log "Checking latest Terraform version..."
  local latest_tf
  latest_tf=$(curl -s https://api.github.com/repos/hashicorp/terraform/releases/latest 2>/dev/null | jq -r '.tag_name' | sed 's/^v//' || echo "unknown")

  if [[ "${latest_tf}" != "unknown" && "${latest_tf}" != "${CURRENT_TF_VERSION}" ]]; then
    log "Terraform: ${CURRENT_TF_VERSION} -> ${latest_tf} (UPDATE AVAILABLE)"
    echo "{\"name\":\"Terraform\",\"current\":\"${CURRENT_TF_VERSION}\",\"latest\":\"${latest_tf}\"}"
  else
    log "Terraform: ${CURRENT_TF_VERSION} (current)"
  fi
}

check_helm_charts() {
  log "Checking Helm chart versions..."
  local updates=()

  if command -v helm >/dev/null 2>&1; then
    local chart_dir="infrastructure/k8s/helm/gistpin"
    if [[ -f "${chart_dir}/Chart.yaml" ]]; then
      local dependencies
      dependencies=$(grep -A2 'dependencies:' "${chart_dir}/Chart.yaml" 2>/dev/null | grep 'name:' | awk '{print $2}' || true)
      while IFS= read -r dep; do
        [[ -z "${dep}" ]] && continue
        local repo_url
        repo_url=$(grep -B3 "name: ${dep}" "${chart_dir}/Chart.yaml" | grep 'repository:' | awk '{print $2}' || true)
        local current_version
        current_version=$(grep -B3 "name: ${dep}" "${chart_dir}/Chart.yaml" | grep 'version:' | head -1 | awk '{print $2}' || true)

        if [[ -n "${repo_url}" && -n "${current_version}" ]]; then
          helm repo add "${dep}" "${repo_url}" 2>/dev/null || true
          local latest_version
          latest_version=$(helm search repo "${dep}" --versions 2>/dev/null | head -2 | tail -1 | awk '{print $2}' || echo "")

          if [[ -n "${latest_version}" && "${latest_version}" != "${current_version}" ]]; then
            log "Helm chart ${dep}: ${current_version} -> ${latest_version} (UPDATE AVAILABLE)"
            updates+=("{\"name\":\"helm-${dep}\",\"current\":\"${current_version}\",\"latest\":\"${latest_version}\"}")
          fi
        fi
      done <<< "${dependencies}"
    fi
  else
    log "helm not available, skipping chart checks."
  fi

  printf "%s\n" "${updates[@]:-}"
}

check_base_images() {
  log "Checking base image versions..."
  local updates=()

  local dockerfiles
  dockerfiles=$(find . -name "Dockerfile" -not -path "*/node_modules/*" 2>/dev/null || true)
  while IFS= read -r dockerfile; do
    [[ -z "${dockerfile}" ]] && continue
    local from_lines
    from_lines=$(grep -i '^FROM' "${dockerfile}" 2>/dev/null || true)
    while IFS= read -r from_line; do
      [[ -z "${from_line}" ]] && continue
      local image
      image=$(echo "${from_line}" | awk '{print $2}' | cut -d: -f1)
      local tag
      tag=$(echo "${from_line}" | awk '{print $2}' | cut -d: -f2- || echo "latest")

      if echo "${image}" | grep -qE '^node|^python|^ubuntu|^alpine|^nginx|^postgres'; then
        log "Base image in ${dockerfile}: ${image}:${tag}"
      fi
    done <<< "${from_lines}"
  done <<< "${dockerfiles}"

  printf "%s\n" "${updates[@]:-}"
}

generate_report() {
  local terraform_update="$1"
  local chart_updates="$2"
  local all_updates=()

  if [[ -n "${terraform_update}" ]]; then
    all_updates+=("${terraform_update}")
  fi
  if [[ -n "${chart_updates}" ]]; then
    while IFS= read -r line; do
      [[ -n "${line}" ]] && all_updates+=("${line}")
    done <<< "${chart_updates}"
  fi

  local updates_json
  if [[ ${#all_updates[@]} -gt 0 ]]; then
    updates_json=$(printf "%s\n" "${all_updates[@]}" | jq -s '.' 2>/dev/null || echo "[]")
  else
    updates_json="[]"
  fi

  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson updates "${updates_json}" \
    --arg update_count "${#all_updates[@]}" \
    '{timestamp: $timestamp, update_count: $update_count, updates: $updates}' \
    > "${REPORT_FILE}"
  log "Version report written to ${REPORT_FILE}"
}

main() {
  log "Checking infrastructure dependency versions..."

  local tf_update
  tf_update="$(check_terraform_version)"

  local chart_updates
  chart_updates="$(check_helm_charts)"

  check_base_images

  generate_report "${tf_update}" "${chart_updates}"

  log "Version check completed."
}

main "$@"
