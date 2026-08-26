#!/usr/bin/env bash
#
# onboard-tenant.sh – provision an isolated tenant namespace on the shared
# GistPin Kubernetes cluster.
#
# Usage:
#   ./onboard-tenant.sh <tenant-name> [small|medium|large]
#
# Examples:
#   ./onboard-tenant.sh acme-corp medium
#   ./onboard-tenant.sh beta-testers small
#
# The script:
#   1. Validates the tenant name (RFC-1123 label) and checks for collisions
#   2. Renders infrastructure/k8s/multi-tenancy/tenant-template.yaml with
#      tier-based quota values
#   3. Applies the rendered manifests and verifies isolation objects exist
#
# Requirements: kubectl, envsubst (gettext), yq (optional, for verification).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/../k8s/multi-tenancy/tenant-template.yaml"
RENDER_DIR="${SCRIPT_DIR}/../k8s/multi-tenancy/rendered"
mkdir -p "${RENDER_DIR}"

usage() {
    echo "Usage: $0 <tenant-name> [small|medium|large]"
    exit 1
}

[[ $# -ge 1 ]] || usage

TENANT_NAME="$1"
TENANT_TIER="${2:-small}"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

if ! [[ "${TENANT_NAME}" =~ ^[a-z0-9]([a-z0-9-]{0,53}[a-z0-9])?$ ]]; then
    echo "ERROR: tenant name '${TENANT_NAME}' must be a valid RFC-1123 DNS label" \
         "(lowercase alphanumerics and '-', max 63 chars)." >&2
    exit 1
fi

case "${TENANT_TIER}" in
    small)  QUOTA_REQUESTS_CPU="500m";   QUOTA_REQUESTS_MEMORY="1Gi";
            QUOTA_LIMITS_CPU="2";        QUOTA_LIMITS_MEMORY="4Gi";
            QUOTA_PVCS="5";              QUOTA_PODS="20" ;;
    medium) QUOTA_REQUESTS_CPU="2000m";  QUOTA_REQUESTS_MEMORY="4Gi";
            QUOTA_LIMITS_CPU="6";        QUOTA_LIMITS_MEMORY="12Gi";
            QUOTA_PVCS="20";             QUOTA_PODS="60" ;;
    large)  QUOTA_REQUESTS_CPU="6000m";  QUOTA_REQUESTS_MEMORY="12Gi";
            QUOTA_LIMITS_CPU="16";       QUOTA_LIMITS_MEMORY="32Gi";
            QUOTA_PVCS="50";             QUOTA_PODS="200" ;;
    *) echo "ERROR: unknown tier '${TENANT_TIER}' (expected small|medium|large)" >&2; exit 1 ;;
esac

NAMESPACE_NAME="tenant-${TENANT_NAME}"

if kubectl get namespace "${NAMESPACE_NAME}" >/dev/null 2>&1; then
    echo "ERROR: namespace '${NAMESPACE_NAME}' already exists." >&2
    exit 1
fi

command -v envsubst >/dev/null 2>&1 || {
    echo "ERROR: envsubst not found. Install gettext (e.g. 'apt-get install gettext')." >&2
    exit 1
}

# ---------------------------------------------------------------------------
# Render + apply
# ---------------------------------------------------------------------------

RENDERED_FILE="${RENDER_DIR}/${TENANT_NAME}.yaml"

export TENANT_NAME TENANT_TIER \
       QUOTA_REQUESTS_CPU QUOTA_REQUESTS_MEMORY \
       QUOTA_LIMITS_CPU QUOTA_LIMITS_MEMORY QUOTA_PVCS QUOTA_PODS

envsubst '${TENANT_NAME} ${TENANT_TIER} ${QUOTA_REQUESTS_CPU} ${QUOTA_REQUESTS_MEMORY} ${QUOTA_LIMITS_CPU} ${QUOTA_LIMITS_MEMORY} ${QUOTA_PVCS} ${QUOTA_PODS}' \
    < "${TEMPLATE_FILE}" > "${RENDERED_FILE}"

echo "==> Applying tenant '${TENANT_NAME}' (tier: ${TENANT_TIER}) as namespace '${NAMESPACE_NAME}'"
kubectl apply -f "${RENDERED_FILE}"

# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

echo "==> Verifying isolation objects"
for kind in ResourceQuota LimitRange NetworkPolicy ServiceAccount; do
    count=$(kubectl get "${kind}" -n "${NAMESPACE_NAME}" --no-headers 2>/dev/null | wc -l)
    if [[ "${count}" -eq 0 ]]; then
        echo "WARNING: no ${kind} found in ${NAMESPACE_NAME} — review onboarding!" >&2
    fi
done

echo ""
echo "Tenant onboarded successfully:"
echo "  Namespace : ${NAMESPACE_NAME}"
echo "  Tier      : ${TENANT_TIER}"
echo "  Rendered  : ${RENDERED_FILE}"
echo ""
echo "Next steps:"
echo "  * Hand the '${TENANT_NAME}-workload' service account to the tenant."
echo "  * Confirm default-deny NetworkPolicies with a cross-namespace probe:"
echo "      kubectl run netcheck --image=busybox --restart=Never -n ${NAMESPACE_NAME} \\"
echo "        -- wget -qO- --timeout=3 http://<service-in-another-namespace>/ && echo LEAK || echo ISOLATED"
