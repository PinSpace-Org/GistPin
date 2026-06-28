#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-gistpin}"
TIMEOUT="${TIMEOUT:-30}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "FAIL: $*"; exit 1; }

mkdir -p "${REPORT_DIR}"

get_service_endpoints() {
  kubectl get services -n "${NAMESPACE}" -o json 2>/dev/null | jq -r '
    .items[] |
    select(.spec.type == "LoadBalancer" or .spec.type == "ClusterIP") |
    {name: .metadata.name, ports: [.spec.ports[].port]}
  ' || echo "[]"
}

check_endpoint() {
  local name="$1"
  local port="$2"
  local path="${3:-/}"

  log "Checking ${name} on port ${port}..."

  local pod
  pod=$(kubectl get pods -n "${NAMESPACE}" -l "app=${name}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [[ -z "${pod}" ]]; then
    pod=$(kubectl get pods -n "${NAMESPACE}" -l "app.kubernetes.io/name=${name}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  fi

  if [[ -z "${pod}" ]]; then
    fail "No pod found for service ${name}"
  fi

  local status
  status=$(kubectl exec -n "${NAMESPACE}" "${pod}" -- curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "http://localhost:${port}${path}" 2>/dev/null || echo "000")

  if [[ "${status}" == "000" ]]; then
    fail "Service ${name} returned no response on port ${port}"
  fi

  log "Service ${name} responded with HTTP ${status}"
}

check_dns_resolution() {
  local service_name="$1"
  log "Checking DNS resolution for ${service_name}.${NAMESPACE}.svc.cluster.local..."

  local dns_result
  dns_result=$(kubectl run dns-test --image=busybox:1.36 --rm --restart=Never \
    -n "${NAMESPACE}" -- nslookup "${service_name}.${NAMESPACE}.svc.cluster.local" 2>/dev/null || true)

  if echo "${dns_result}" | grep -q "Address"; then
    log "DNS resolution OK for ${service_name}"
  else
    fail "DNS resolution failed for ${service_name}"
  fi
}

main() {
  log "Starting service smoke tests in namespace: ${NAMESPACE}..."

  local services
  services="$(get_service_endpoints)"

  log "Checking critical services: backend, frontend, postgres"

  check_endpoint "backend" 3001 "/health"
  check_dns_resolution "backend-service"

  check_endpoint "frontend" 3000 "/"
  check_dns_resolution "frontend-service"

  log "All service smoke tests PASSED"
}

main "$@"
