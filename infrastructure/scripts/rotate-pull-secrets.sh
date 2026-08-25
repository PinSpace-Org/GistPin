#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

K8S_DIR="${K8S_DIR:-infrastructure/k8s}"
SECRET_NAME="${SECRET_NAME:-ghcr-pull-secret}"
REGISTRY="${REGISTRY:-ghcr.io}"
NAMESPACES="${NAMESPACES:-gistpin}"
SERVICE_ACCOUNTS="${SERVICE_ACCOUNTS:-default}"
DRY_RUN="${DRY_RUN:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Rotate image pull secrets for private container registry access.

Options:
  -n, --namespaces NS    Comma-separated namespaces (default: gistpin)
  -s, --secret NAME      Secret name (default: ghcr-pull-secret)
  -r, --registry URL     Registry URL (default: ghcr.io)
  -u, --username USER    Registry username
  -p, --password PASS    Registry password/token
  --dry-run              Show what would be done without executing
  -h, --help             Show this help message

Environment Variables:
  REGISTRY_USER          Registry username
  REGISTRY_PASSWORD      Registry password/token
  SECRET_NAME            Secret name
  REGISTRY               Registry URL
EOF
  exit 0
}

REGISTRY_USER="${REGISTRY_USER:-}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-}"

while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--namespaces) NAMESPACES="$2"; shift 2 ;;
    -s|--secret) SECRET_NAME="$2"; shift 2 ;;
    -r|--registry) REGISTRY="$2"; shift 2 ;;
    -u|--username) REGISTRY_USER="$2"; shift 2 ;;
    -p|--password) REGISTRY_PASSWORD="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$REGISTRY_USER" || -z "$REGISTRY_PASSWORD" ]]; then
  error "Registry credentials required. Use --username/--password or REGISTRY_USER/REGISTRY_PASSWORD env vars."
  exit 1
fi

rotate_secret() {
  local namespace="$1"
  log "Rotating pull secret in namespace: ${namespace}"

  local secret_json
  secret_json=$(kubectl create secret docker-registry "${SECRET_NAME}" \
    --namespace="${namespace}" \
    --docker-server="${REGISTRY}" \
    --docker-username="${REGISTRY_USER}" \
    --docker-password="${REGISTRY_PASSWORD}" \
    --dry-run=client -o json 2>/dev/null)

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would create/update secret ${SECRET_NAME} in ${namespace}"
    echo "${secret_json}" | jq '.metadata.name, .metadata.namespace'
    return 0
  fi

  if kubectl get secret "${SECRET_NAME}" -n "${namespace}" >/dev/null 2>&1; then
    log "Secret ${SECRET_NAME} exists in ${namespace}, patching..."
    echo "${secret_json}" | kubectl apply -f - -n "${namespace}"
  else
    log "Secret ${SECRET_NAME} not found in ${namespace}, creating..."
    echo "${secret_json}" | kubectl apply -f - -n "${namespace}"
  fi

  success "Secret rotated in ${namespace}"
}

update_service_accounts() {
  local namespace="$1"
  log "Updating service accounts in namespace: ${namespace}"

  local sa_list
  if [[ "${SERVICE_ACCOUNTS}" == "all" ]]; then
    sa_list=$(kubectl get serviceaccounts -n "${namespace}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
  else
    sa_list="${SERVICE_ACCOUNTS}"
  fi

  for sa in $sa_list; do
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN: Would patch service account ${sa} in ${namespace}"
      continue
    fi

    kubectl patch serviceaccount "${sa}" \
      -n "${namespace}" \
      -p "{\"imagePullSecrets\": [{\"name\": \"${SECRET_NAME}\"}]}" 2>/dev/null || \
      warn "Failed to patch service account ${sa} in ${namespace}"
  done
}

verify_rotation() {
  local namespace="$1"
  log "Verifying rotation in namespace: ${namespace}"

  if kubectl get secret "${SECRET_NAME}" -n "${namespace}" >/dev/null 2>&1; then
    local created_at
    created_at=$(kubectl get secret "${SECRET_NAME}" -n "${namespace}" \
      -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null)
    success "Secret verified in ${namespace} (created: ${created_at})"
    return 0
  else
    error "Secret ${SECRET_NAME} not found in ${namespace} after rotation"
    return 1
  fi
}

main() {
  log "Starting image pull secret rotation..."
  log "Registry: ${REGISTRY}, Secret: ${SECRET_NAME}"
  log "Namespaces: ${NAMESPACES}"

  local failures=0

  IFS=',' read -ra ns_list <<< "${NAMESPACES}"
  for namespace in "${ns_list[@]}"; do
    namespace=$(echo "$namespace" | xargs)

    if ! rotate_secret "$namespace"; then
      failures=$((failures + 1))
      continue
    fi

    if ! update_service_accounts "$namespace"; then
      failures=$((failures + 1))
    fi

    if ! verify_rotation "$namespace"; then
      failures=$((failures + 1))
    fi
  done

  if [[ $failures -gt 0 ]]; then
    error "Rotation completed with ${failures} failure(s)"
    exit 1
  fi

  success "Pull secret rotation completed successfully for all namespaces"
}

main "$@"
