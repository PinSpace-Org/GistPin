#!/usr/bin/env bash
# teardown-env.sh — destroy an ephemeral GistPin test environment
# Usage: ./teardown-env.sh <env-name>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/terraform/ephemeral-env"
REGISTRY_FILE="${SCRIPT_DIR}/.env-registry"

ENV_NAME="${1:-}"
if [[ -z "${ENV_NAME}" ]]; then
  echo "Usage: $0 <env-name>" >&2
  exit 1
fi

echo "==> Tearing down ephemeral environment: ${ENV_NAME}"

# ── Lookup region from registry ───────────────────────────────────────────────
REGION="us-east-1"
if [[ -f "${REGISTRY_FILE}" ]]; then
  REG_LINE="$(grep "^${ENV_NAME}|" "${REGISTRY_FILE}" || true)"
  if [[ -n "${REG_LINE}" ]]; then
    REGION="$(echo "${REG_LINE}" | cut -d'|' -f2)"
  fi
fi

# ── Select Terraform workspace ────────────────────────────────────────────────
terraform -chdir="${TF_DIR}" init -input=false -reconfigure \
  -backend-config="key=gistpin/ephemeral/${ENV_NAME}/terraform.tfstate"

terraform -chdir="${TF_DIR}" workspace select "${ENV_NAME}" 2>/dev/null \
  || { echo "Workspace ${ENV_NAME} not found — nothing to destroy." ; exit 0; }

# ── Destroy ───────────────────────────────────────────────────────────────────
echo "--> Destroying resources..."
terraform -chdir="${TF_DIR}" destroy -input=false -auto-approve \
  -var="environment=${ENV_NAME}" \
  -var="region=${REGION}" \
  -var="project_name=gistpin"

# ── Switch back to default and delete workspace ───────────────────────────────
terraform -chdir="${TF_DIR}" workspace select default
terraform -chdir="${TF_DIR}" workspace delete "${ENV_NAME}"

# ── Remove from registry ──────────────────────────────────────────────────────
if [[ -f "${REGISTRY_FILE}" ]]; then
  grep -v "^${ENV_NAME}|" "${REGISTRY_FILE}" > "${REGISTRY_FILE}.tmp" \
    && mv "${REGISTRY_FILE}.tmp" "${REGISTRY_FILE}" || true
  echo "--> Removed '${ENV_NAME}' from registry."
fi

# ── Clean up kubeconfig ───────────────────────────────────────────────────────
KUBECONFIG_FILE="${SCRIPT_DIR}/.kubeconfig-${ENV_NAME}"
[[ -f "${KUBECONFIG_FILE}" ]] && rm -f "${KUBECONFIG_FILE}" && echo "--> Removed kubeconfig."

echo "==> Environment '${ENV_NAME}' destroyed successfully."
