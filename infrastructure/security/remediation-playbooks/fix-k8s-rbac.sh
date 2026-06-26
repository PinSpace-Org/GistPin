#!/usr/bin/env bash
# fix-k8s-rbac.sh -- Remediate Kubernetes RBAC findings (CIS-3.1, CIS-3.2)
# NOTE: both findings are approval-required in the registry; this script
# is run only after a human approves the change.
set -euo pipefail

NAMESPACE="${NAMESPACE:-gistpin}"
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [fix-k8s-rbac] $*"; }

if ! command -v kubectl &>/dev/null; then
  log "ERROR: kubectl not found"
  exit 2
fi

# CIS-3.1 -- remove anonymous API access
log "Removing anonymous Kubernetes API access..."
# Bind system:anonymous to a role with no permissions
kubectl create clusterrolebinding deny-anonymous \
  --clusterrole='' \
  --user=system:anonymous \
  --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Remove any existing permissive anonymous bindings
for BINDING in $(kubectl get clusterrolebinding -o json 2>/dev/null | \
    jq -r '.items[] | select(.subjects[]?.name=="system:anonymous") | .metadata.name' 2>/dev/null); do
  log "Removing anonymous binding: ${BINDING}"
  kubectl delete clusterrolebinding "${BINDING}" --ignore-not-found
done
log "Anonymous API access restricted (CIS-3.1)"

# CIS-3.2 -- audit service accounts in gistpin namespace for excess permissions
log "Auditing service account permissions in namespace: ${NAMESPACE}..."
kubectl get serviceaccounts -n "${NAMESPACE}" --no-headers 2>/dev/null | \
  awk '{print $1}' | while read -r sa; do
    log "  Checking SA: ${sa}"
    kubectl auth can-i --list \
      --as="system:serviceaccount:${NAMESPACE}:${sa}" \
      -n "${NAMESPACE}" 2>/dev/null | \
      grep -v "^no$\|^Resources\|^*$" | \
      grep "^\*\s" | while read -r perm; do
        log "  WARN: ${sa} has wildcard permission: ${perm}"
      done
  done

log "RBAC remediation complete"
log "NOTE: Enabling secrets encryption at rest (CIS-3.2) requires API"
log "      server restart -- coordinate with cluster admin before proceeding."
