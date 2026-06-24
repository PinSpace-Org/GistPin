#!/usr/bin/env bash
# provision-env.sh — spin up an ephemeral GistPin test environment on demand
# Usage: ./provision-env.sh [ENV_NAME] [--region us-east-1]
# Example: ./provision-env.sh pr-123 --region eu-west-1
set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/terraform/ephemeral-env"
REGISTRY_FILE="${SCRIPT_DIR}/.env-registry"

ENV_NAME="${1:-}"
REGION="us-east-1"
PROJECT="gistpin"

# Parse optional flags
shift 1 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "${ENV_NAME}" ]]; then
  echo "Usage: $0 <env-name> [--region <aws-region>]" >&2
  exit 1
fi

# Sanitise env name (lowercase alphanumeric + hyphens, max 20 chars)
ENV_NAME="${ENV_NAME,,}"
ENV_NAME="${ENV_NAME//[^a-z0-9-]/\-}"
ENV_NAME="${ENV_NAME:0:20}"

echo "==> Provisioning ephemeral environment: ${ENV_NAME} (region: ${REGION})"

# ── Prerequisites check ───────────────────────────────────────────────────────
for cmd in terraform aws kubectl; do
  command -v "${cmd}" &>/dev/null || { echo "ERROR: ${cmd} not found in PATH" >&2; exit 1; }
done

# ── Terraform workspace & apply ───────────────────────────────────────────────
echo "--> Initialising Terraform..."
terraform -chdir="${TF_DIR}" init -input=false -reconfigure \
  -backend-config="key=${PROJECT}/ephemeral/${ENV_NAME}/terraform.tfstate"

echo "--> Selecting / creating workspace: ${ENV_NAME}"
terraform -chdir="${TF_DIR}" workspace select "${ENV_NAME}" 2>/dev/null \
  || terraform -chdir="${TF_DIR}" workspace new "${ENV_NAME}"

echo "--> Planning..."
terraform -chdir="${TF_DIR}" plan -input=false \
  -var="environment=${ENV_NAME}" \
  -var="region=${REGION}" \
  -var="project_name=${PROJECT}" \
  -out="${TF_DIR}/${ENV_NAME}.tfplan"

echo "--> Applying..."
terraform -chdir="${TF_DIR}" apply -input=false -auto-approve "${TF_DIR}/${ENV_NAME}.tfplan"

# ── Capture outputs ───────────────────────────────────────────────────────────
KUBECONFIG_B64="$(terraform -chdir="${TF_DIR}" output -raw kubeconfig_base64 2>/dev/null || echo '')"
COST_TAG="ephemeral/${ENV_NAME}"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ── Register environment ──────────────────────────────────────────────────────
echo "--> Registering environment in ${REGISTRY_FILE}"
touch "${REGISTRY_FILE}"
# Remove any existing entry for this env
grep -v "^${ENV_NAME}|" "${REGISTRY_FILE}" > "${REGISTRY_FILE}.tmp" && mv "${REGISTRY_FILE}.tmp" "${REGISTRY_FILE}" || true
echo "${ENV_NAME}|${REGION}|${CREATED_AT}|${COST_TAG}|active" >> "${REGISTRY_FILE}"

# ── Optional: update kubeconfig ───────────────────────────────────────────────
if [[ -n "${KUBECONFIG_B64}" ]]; then
  KUBECONFIG_FILE="${SCRIPT_DIR}/.kubeconfig-${ENV_NAME}"
  echo "${KUBECONFIG_B64}" | base64 -d > "${KUBECONFIG_FILE}"
  chmod 600 "${KUBECONFIG_FILE}"
  echo "--> Kubeconfig written to ${KUBECONFIG_FILE}"
  echo "    Export: export KUBECONFIG=${KUBECONFIG_FILE}"
fi

echo "==> Environment '${ENV_NAME}' is ready."
echo "    Teardown: ${SCRIPT_DIR}/teardown-env.sh ${ENV_NAME}"
