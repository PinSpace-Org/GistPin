#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

CONFIG_PATH="infrastructure/ci/update-config.json"
EXCLUDES="$(jq -r '.exclude[]?' "${CONFIG_PATH}" 2>/dev/null || true)"

collect_outdated() {
  local dir="$1"
  if [[ -f "${dir}/package.json" ]]; then
    (cd "${dir}" && npm outdated --json || true)
  else
    echo "{}"
  fi
}

mkdir -p infrastructure/ci/reports
REPORT_FILE="infrastructure/ci/reports/dependency-outdated-report.json"

root_outdated="$(collect_outdated ".")"
frontend_outdated="$(collect_outdated "Frontend")"
backend_outdated="$(collect_outdated "Backend")"
analytics_outdated="$(collect_outdated "analytics")"

jq -n \
  --argjson root "${root_outdated:-{}}" \
  --argjson frontend "${frontend_outdated:-{}}" \
  --argjson backend "${backend_outdated:-{}}" \
  --argjson analytics "${analytics_outdated:-{}}" \
  '{root:$root, frontend:$frontend, backend:$backend, analytics:$analytics}' > "${REPORT_FILE}"

if [[ -n "${EXCLUDES}" ]]; then
  while IFS= read -r pkg; do
    jq "walk(if type == \"object\" then del(.\"${pkg}\") else . end)" "${REPORT_FILE}" > "${REPORT_FILE}.tmp"
    mv "${REPORT_FILE}.tmp" "${REPORT_FILE}"
  done <<<"${EXCLUDES}"
fi

run_updates() {
  local dir="$1"
  if [[ -f "${dir}/package.json" ]]; then
    (cd "${dir}" && npm update)
  fi
}

run_updates "."
run_updates "Frontend"
run_updates "Backend"
run_updates "analytics"

run_tests_if_present() {
  local dir="$1"
  if [[ -f "${dir}/package.json" ]]; then
    has_test="$(jq -r '.scripts.test // empty' "${dir}/package.json")"
    if [[ -n "${has_test}" ]]; then
      (cd "${dir}" && npm test)
    fi
  fi
}

run_tests_if_present "."
run_tests_if_present "Frontend"
run_tests_if_present "Backend"
run_tests_if_present "analytics"

echo "Dependency update and test run completed."
