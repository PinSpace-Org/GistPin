#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${1:-}"
OWNER="${2:-}"
COST_CENTER="${3:-engineering}"
ENVIRONMENT="${4:-development}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
error() { log "ERROR: $*"; exit 1; }

if [[ -z "${NAMESPACE}" ]]; then
  error "Usage: $0 <namespace> [owner] [cost-center] [environment]"
fi
if [[ -z "${OWNER}" ]]; then
  error "Owner is required. Usage: $0 <namespace> <owner>"
fi

log "Provisioning namespace: ${NAMESPACE}"

TEMPLATE_FILE="infrastructure/k8s/namespace-template.yaml"
if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  error "Namespace template not found: ${TEMPLATE_FILE}"
fi

CLEANUP_DATE=$(date -u -d "+${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -u -v "+${RETENTION_DAYS}d" +%Y-%m-%d 2>/dev/null || echo "unknown")

sed \
  -e "s/__NAMESPACE__/${NAMESPACE}/g" \
  -e "s/__OWNER__/${OWNER}/g" \
  -e "s/__COST_CENTER__/${COST_CENTER}/g" \
  -e "s/__ENVIRONMENT__/${ENVIRONMENT}/g" \
  -e "s/__CLEANUP_DATE__/${CLEANUP_DATE}/g" \
  "${TEMPLATE_FILE}" | kubectl apply -f -

log "Applying default resource quotas..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    persistentvolumeclaims: 5
    pods: 20
    services: 10
EOF

log "Applying default network policy..."
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: ${NAMESPACE}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
EOF

log "Namespace ${NAMESPACE} provisioned successfully."
log "Owner: ${OWNER}, Cost Center: ${COST_CENTER}, Environment: ${ENVIRONMENT}"
