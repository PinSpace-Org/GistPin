#!/usr/bin/env bash
# upgrade-cluster.sh — semi-automated Kubernetes cluster upgrade
# Usage: ./upgrade-cluster.sh --target-version 1.30 [--dry-run]
set -euo pipefail

TARGET_VERSION=""
DRY_RUN=false
CLUSTER_NAME="${CLUSTER_NAME:-gistpin-cluster}"
REGION="${AWS_REGION:-us-east-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-version) TARGET_VERSION="$2"; shift 2 ;;
    --dry-run)        DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

[[ -z "${TARGET_VERSION}" ]] && { echo "ERROR: --target-version required"; exit 1; }

RUN() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY-RUN] $*"
  else
    echo "[RUN] $*"
    eval "$@"
  fi
}

echo "=== GistPin EKS Cluster Upgrade ==="
echo "Cluster: ${CLUSTER_NAME} | Target: ${TARGET_VERSION} | Region: ${REGION}"
echo ""

# --- 1. Pre-upgrade compatibility check ---
echo "--- Step 1: Pre-upgrade compatibility check ---"
CURRENT_VERSION=$(aws eks describe-cluster \
  --name "${CLUSTER_NAME}" --region "${REGION}" \
  --query 'cluster.version' --output text 2>/dev/null || echo "unknown")
echo "Current version: ${CURRENT_VERSION}"

bash "$(dirname "$0")/validate-upgrade.sh" \
  --current "${CURRENT_VERSION}" --target "${TARGET_VERSION}" \
  ${DRY_RUN:+--dry-run}

# --- 2. Upgrade control plane ---
echo ""
echo "--- Step 2: Control plane upgrade ---"
RUN aws eks update-cluster-version \
  --name "${CLUSTER_NAME}" \
  --kubernetes-version "${TARGET_VERSION}" \
  --region "${REGION}"

if [[ "${DRY_RUN}" != "true" ]]; then
  echo "Waiting for control plane upgrade to complete..."
  aws eks wait cluster-active --name "${CLUSTER_NAME}" --region "${REGION}"
fi

# --- 3. Rolling node group upgrade ---
echo ""
echo "--- Step 3: Node group rolling upgrade ---"
NODE_GROUPS=$(aws eks list-nodegroups \
  --cluster-name "${CLUSTER_NAME}" --region "${REGION}" \
  --query 'nodegroups[*]' --output text 2>/dev/null || echo "")

for ng in ${NODE_GROUPS}; do
  echo "Upgrading node group: ${ng}"
  RUN aws eks update-nodegroup-version \
    --cluster-name "${CLUSTER_NAME}" \
    --nodegroup-name "${ng}" \
    --kubernetes-version "${TARGET_VERSION}" \
    --region "${REGION}"

  if [[ "${DRY_RUN}" != "true" ]]; then
    aws eks wait nodegroup-active \
      --cluster-name "${CLUSTER_NAME}" \
      --nodegroup-name "${ng}" \
      --region "${REGION}"
    echo "Node group ${ng} upgraded successfully."
  fi
done

# --- 4. Post-upgrade validation ---
echo ""
echo "--- Step 4: Post-upgrade validation ---"
bash "$(dirname "$0")/validate-upgrade.sh" \
  --current "${TARGET_VERSION}" --target "${TARGET_VERSION}" \
  ${DRY_RUN:+--dry-run}

echo ""
echo "=== Upgrade complete ==="
