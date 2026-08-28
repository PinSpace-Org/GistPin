#!/usr/bin/env bash
# dry-run-apply.sh — run terraform plan in an ephemeral workspace with cost estimation
# Usage: ./dry-run-apply.sh [--dir <tf_dir>] [--cleanup]
set -euo pipefail

TF_DIR="${TF_DIR:-infrastructure/terraform/dry-run}"
WORKSPACE="dry-run-$$"
CLEANUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)     TF_DIR="$2"; shift 2 ;;
    --cleanup) CLEANUP=true; shift ;;
    *)         echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "==> Initialising Terraform in ${TF_DIR}"
terraform -chdir="${TF_DIR}" init -input=false -reconfigure

echo "==> Creating ephemeral workspace: ${WORKSPACE}"
terraform -chdir="${TF_DIR}" workspace new "${WORKSPACE}"

cleanup() {
  if [[ "${CLEANUP}" == "true" ]]; then
    echo "==> Cleaning up workspace ${WORKSPACE}"
    terraform -chdir="${TF_DIR}" workspace select default
    terraform -chdir="${TF_DIR}" workspace delete -force "${WORKSPACE}" || true
  fi
}
trap cleanup EXIT

echo "==> Running dry-run plan (no apply)"
terraform -chdir="${TF_DIR}" plan \
  -var="environment=dry-run" \
  -var="cost_estimate_only=true" \
  -out="dry-run.tfplan" \
  -input=false

echo "==> Showing plan summary"
terraform -chdir="${TF_DIR}" show -no-color dry-run.tfplan

# Cost estimation via infracost (optional — skipped if not installed)
if command -v infracost &>/dev/null; then
  echo "==> Estimating costs"
  infracost breakdown --path "${TF_DIR}" --format table
else
  echo "==> infracost not found — skipping cost estimation"
fi

echo "==> Dry-run complete. No resources were created."
