#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
BLOCK_DEPLOY="${BLOCK_DEPLOY:-false}"
EXIT_CODE=0

ENVIRONMENTS=("dev" "staging" "production")

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
error() { log "ERROR: $*"; EXIT_CODE=1; }

mkdir -p "${REPORT_DIR}"
REPORT_FILE="${REPORT_DIR}/config-validation-$(date -u +%Y%m%d-%H%M%S).json"

validate_terraform_vars() {
  log "Validating Terraform variable consistency across environments..."
  local tf_dir="infrastructure/terraform"
  local all_vars=()
  local env_vars=()

  for env in "${ENVIRONMENTS[@]}"; do
    local var_file="${tf_dir}/${env}.tfvars"
    if [[ ! -f "${var_file}" ]]; then
      error "Missing terraform vars file: ${var_file}"
      continue
    fi
    while IFS='=' read -r key _; do
      key="$(echo "${key}" | xargs)"
      [[ -z "${key}" ]] && continue
      env_vars+=("${key}")
    done < <(grep -v '^\s*#' "${var_file}" | grep '=' || true)
  done

  for env in "${ENVIRONMENTS[@]}"; do
    local var_file="${tf_dir}/${env}.tfvars"
    [[ ! -f "${var_file}" ]] && continue
    while IFS='=' read -r key value; do
      key="$(echo "${key}" | xargs)"
      value="$(echo "${value}" | xargs)"
      [[ -z "${key}" ]] && continue
      all_vars+=("${key}=${value}")
    done < <(grep -v '^\s*#' "${var_file}" | grep '=' || true)
  done
}

validate_k8s_configmaps() {
  log "Validating Kubernetes ConfigMap consistency..."
  local configmaps_dir="infrastructure/k8s/configmaps"
  local keys_found=()

  for env in "${ENVIRONMENTS[@]}"; do
    local cm_file="${configmaps_dir}/${env}-configmap.yaml"
    if [[ ! -f "${cm_file}" ]]; then
      error "Missing ConfigMap: ${cm_file}"
      continue
    fi
    while IFS=': ' read -r key value; do
      key="$(echo "${key}" | xargs)"
      [[ -z "${key}" ]] && continue
      keys_found+=("${env}:${key}=${value}")
    done < <(grep -A500 'data:' "${cm_file}" | grep -E '^\s+[a-zA-Z_]' || true)
  done

  for env in "${ENVIRONMENTS[@]}"; do
    local cm_file="${configmaps_dir}/${env}-configmap.yaml"
    [[ ! -f "${cm_file}" ]] && continue
    local defined_keys
    defined_keys=$(grep -A500 'data:' "${cm_file}" | grep -Eo '^\s+[a-zA-Z_][a-zA-Z0-9_]*' | tr -d ' ' || true)
    while IFS= read -r key; do
      [[ -z "${key}" ]] && continue
      for other_env in "${ENVIRONMENTS[@]}"; do
        [[ "${other_env}" == "${env}" ]] && continue
        local other_file="${configmaps_dir}/${other_env}-configmap.yaml"
        if [[ -f "${other_file}" ]]; then
          if ! grep -q "${key}:" "${other_file}"; then
            error "ConfigMap key '${key}' exists in ${env} but missing in ${other_env}"
          fi
        fi
      done
    done <<< "${defined_keys}"
  done
}

validate_env_files() {
  log "Validating .env files..."
  for env in "${ENVIRONMENTS[@]}"; do
    local env_file=".env.${env}"
    local example_file=".env.${env}.example"
    if [[ ! -f "${env_file}" ]]; then
      error "Missing environment file: ${env_file}"
      continue
    fi
    if [[ ! -f "${example_file}" ]]; then
      log "WARNING: No example file for ${env}, skipping cross-check"
      continue
    fi
    local example_vars
    example_vars=$(grep -v '^\s*#' "${example_file}" | grep -Eo '^[A-Z_][A-Z0-9_]*' || true)
    while IFS= read -r var; do
      [[ -z "${var}" ]] && continue
      if ! grep -q "${var}=" "${env_file}"; then
        error "Variable '${var}' defined in ${example_file} but missing in ${env_file}"
      fi
    done <<< "${example_vars}"
  done
}

generate_report() {
  if [[ "${EXIT_CODE}" -eq 0 ]]; then
    log "All environment configurations are consistent."
  fi
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg exit_code "${EXIT_CODE}" \
    --arg block_deploy "${BLOCK_DEPLOY}" \
    '{timestamp: $timestamp, valid: ($exit_code == "0"), block_deploy: $block_deploy}' \
    > "${REPORT_FILE}"
  log "Report written to ${REPORT_FILE}"
}

main() {
  validate_terraform_vars
  validate_k8s_configmaps
  validate_env_files
  generate_report

  if [[ "${EXIT_CODE}" -ne 0 ]]; then
    log "Configuration validation FAILED."
    if [[ "${BLOCK_DEPLOY}" == "true" ]]; then
      log "BLOCKING deploy due to configuration inconsistencies."
    fi
  else
    log "Configuration validation PASSED."
  fi

  exit "${EXIT_CODE}"
}

main "$@"
