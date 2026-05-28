#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
CONFIG_PATH="${REPO_ROOT}/infrastructure/ci/audit-config.toml"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Missing config: ${CONFIG_PATH}"
  exit 1
fi

contracts_dir="$(awk -F'=' '/contracts_dir/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"
output_dir="$(awk -F'=' '/output_dir/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"
severity_threshold="$(awk -F'=' '/severity_threshold/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"
run_cargo_audit="$(awk -F'=' '/run_cargo_audit/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"
run_clippy="$(awk -F'=' '/run_clippy/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"
run_fmt_check="$(awk -F'=' '/run_fmt_check/{gsub(/[ "]/,"",$2); print $2}' "${CONFIG_PATH}")"

contracts_path="${REPO_ROOT}/${contracts_dir}"
report_path="${REPO_ROOT}/${output_dir}"
mkdir -p "${report_path}"

if [[ ! -d "${contracts_path}" ]]; then
  echo "Contracts directory not found: ${contracts_path}"
  exit 1
fi

cd "${contracts_path}"
status=0

if [[ "${run_fmt_check}" == "true" ]]; then
  cargo fmt --all -- --check 2>&1 | tee "${report_path}/cargo-fmt-report.txt" || status=1
fi

if [[ "${run_clippy}" == "true" ]]; then
  cargo clippy --all-targets --all-features -- -D warnings 2>&1 | tee "${report_path}/clippy-report.txt" || status=1
fi

if [[ "${run_cargo_audit}" == "true" ]]; then
  cargo audit --json 2>&1 | tee "${report_path}/cargo-audit-report.json" || status=1
  if [[ -f "${report_path}/cargo-audit-report.json" ]]; then
    critical_count="$(grep -o "\"severity\":\"${severity_threshold}\"" "${report_path}/cargo-audit-report.json" | wc -l | tr -d ' ')"
    if [[ "${critical_count}" -gt 0 ]]; then
      echo "Critical vulnerabilities found: ${critical_count}"
      status=1
    fi
  fi
fi

if [[ "${status}" -ne 0 ]]; then
  echo "Contract audit failed. See reports in ${report_path}"
  exit 1
fi

echo "Contract audit completed successfully."
