#!/usr/bin/env bash
# rotate-spire-roots.sh - Rotate the SPIRE server root trust bundle.
# Regenerates the bootstrap CA, re-distributes the bundle to agents, and
# restarts the SPIRE server to pick up the rotated roots. Rotation runs on a
# schedule (default every 24h) matching the server.yaml ca_rotation_interval.
# Usage: rotate-spire-roots.sh [--interval HOURS] [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

NAMESPACE="${NAMESPACE:-spire}"
DRY_RUN="${DRY_RUN:-false}"
ROOT_INTERVAL="${ROOT_INTERVAL:-24}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
info()   { log "${BLUE}INFO${NC}  $*"; }
success(){ log "${GREEN}OK${NC}    $*"; }
warn()   { log "${YELLOW}WARN${NC}  $*"; }
error()  { log "${RED}ERROR${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Rotate the SPIRE server root trust bundle and re-distribute it to agents.

Options:
  -n, --namespace NS       SPIRE namespace (default: spire)
  -i, --interval HOURS     Rotation interval in hours (default: 24)
  --dry-run                Show actions without applying them
  -h, --help               Show this help message

Examples:
  $0
  $0 --interval 12
  $0 --dry-run
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--namespace)  NAMESPACE="$2"; shift 2 ;;
    -i|--interval)   ROOT_INTERVAL="$2"; shift 2 ;;
    --dry-run)       DRY_RUN="true"; shift ;;
    -h|--help)       usage ;;
    *)               error "Unknown option: $1"; usage ;;
  esac
done

if ! command -v kubectl >/dev/null 2>&1; then
  error "kubectl is required but not available."
  exit 1
fi

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] ${*}"
    return 0
  fi
  info "Running: ${*}"
  "$@"
}

info "Rotating SPIRE root trust bundle (interval: ${ROOT_INTERVAL}h)..."
info "Namespace: ${NAMESPACE}"

# 1. Rotate the server CA / trust bundle via the SPIRE server CLI.
run kubectl exec -n "${NAMESPACE}" deploy/spire-server -- \
  /opt/spire/bin/spire-server bundle show -socketPath /run/spire/sockets/server.sock \
  > /tmp/spire-bundle-before.pem

run kubectl exec -n "${NAMESPACE}" deploy/spire-server -- \
  /opt/spire/bin/spire-server spiffeid rotate -socketPath /run/spire/sockets/server.sock \
  -ttl "$((ROOT_INTERVAL * 3600))"

run kubectl exec -n "${NAMESPACE}" deploy/spire-server -- \
  /opt/spire/bin/spire-server bundle show -socketPath /run/spire/sockets/server.sock \
  > /tmp/spire-bundle-after.pem

# 2. Re-distribute the fresh bundle to agents.
run kubectl create configmap spire-server-bundle -n "${NAMESPACE}" \
  --from-file=root-ca.pem=/tmp/spire-bundle-after.pem --dry-run=client -o yaml \
  | kubectl apply -f -

# 3. Restart the server and refresh agents so they trust the rotated roots.
run kubectl rollout restart -n "${NAMESPACE}" statefulset/spire-server
run kubectl rollout restart -n "${NAMESPACE}" daemonset/spire-agent

success "SPIRE root trust bundle rotated and distributed."
info "Verify rotation with: kubectl exec -n spire deploy/spire-server -- /opt/spire/bin/spire-server bundle show"
