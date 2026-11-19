#!/usr/bin/env bash
# Blue-Green Deployment Automation for GistPin
# Manages parallel blue/green deployments with automated smoke tests,
# traffic switching, rollback on failure, and deployment history tracking.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
K8S_DIR="${REPO_ROOT}/infrastructure/k8s/blue-green"
HISTORY_DIR="${REPO_ROOT}/infrastructure/deployment-history"
SMOKE_TEST_SCRIPT="${SCRIPT_DIR}/smoke-tests.sh"
SWITCH_SCRIPT="${SCRIPT_DIR}/switch-blue-green.sh"

SERVICE_NAME="${SERVICE_NAME:-gistpin-backend}"
NAMESPACE="${NAMESPACE:-gistpin}"
SMOKE_TEST_URL="${SMOKE_TEST_URL:-}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-300}"
SMOKE_TEST_RETRIES="${SMOKE_TEST_RETRIES:-3}"
SMOKE_TEST_INTERVAL="${SMOKE_TEST_INTERVAL:-10}"
DRY_RUN="${DRY_RUN:-false}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ROLLBACK_WINDOW="${ROLLBACK_WINDOW:-600}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
info()   { log "${BLUE}INFO${NC}  $*"; }
success(){ log "${GREEN}OK${NC}    $*"; }
warn()   { log "${YELLOW}WARN${NC}  $*"; }
error()  { log "${RED}ERROR${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Blue-Green Deployment Automation for GistPin

Options:
  -s, --service NAME       Service name (default: gistpin-backend)
  -n, --namespace NS       Kubernetes namespace (default: gistpin)
  -i, --image TAG          Image tag to deploy (default: latest)
  -u, --smoke-url URL      Smoke test base URL (auto-detected if not set)
  -t, --timeout SECS       Deploy timeout in seconds (default: 300)
  -r, --retries N          Smoke test retry count (default: 3)
  -w, --rollback-window S  Rollback window in seconds (default: 600)
  --dry-run                Perform a dry run without applying changes
  -h, --help               Show this help message

Environment Variables:
  KUBECONFIG               Path to kubeconfig file
  IMAGE_TAG                Docker image tag to deploy
  NAMESPACE                Target Kubernetes namespace
  SERVICE_NAME             Target service name

Examples:
  $0 --image v1.2.3 --namespace production
  $0 --dry-run --service gistpin-backend
  IMAGE_TAG=stable $0 -n production -t 120
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--service)     SERVICE_NAME="$2"; shift 2 ;;
    -n|--namespace)   NAMESPACE="$2"; shift 2 ;;
    -i|--image)       IMAGE_TAG="$2"; shift 2 ;;
    -u|--smoke-url)   SMOKE_TEST_URL="$2"; shift 2 ;;
    -t|--timeout)     DEPLOY_TIMEOUT="$2"; shift 2 ;;
    -r|--retries)     SMOKE_TEST_RETRIES="$2"; shift 2 ;;
    -w|--rollback-window) ROLLBACK_WINDOW="$2"; shift 2 ;;
    --dry-run)        DRY_RUN="true"; shift ;;
    -h|--help)        usage ;;
    *)                error "Unknown option: $1"; usage ;;
  esac
done

mkdir -p "${HISTORY_DIR}"

get_active_slot() {
  local active
  active="$(kubectl get service "${SERVICE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")"
  if [[ -z "${active}" ]]; then
    active="blue"
  fi
  echo "${active}"
}

get_inactive_slot() {
  local active
  active="$(get_active_slot)"
  if [[ "${active}" == "blue" ]]; then
    echo "green"
  else
    echo "blue"
  fi
}

record_deployment() {
  local slot="$1"
  local image_tag="$2"
  local status="$3"
  local history_file="${HISTORY_DIR}/deployment-$(date -u +%Y%m%d-%H%M%S).json"

  cat > "${history_file}" <<HISTEOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "service": "${SERVICE_NAME}",
  "namespace": "${NAMESPACE}",
  "slot": "${slot}",
  "image_tag": "${image_tag}",
  "status": "${status}",
  "deployed_by": "$(whoami)",
  "git_commit": "$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
}
HISTEOF
  info "Deployment recorded: ${history_file}"
}

wait_for_deployment() {
  local deployment_name="$1"
  local timeout="$2"
  local elapsed=0

  info "Waiting for deployment/${deployment_name} to be ready (timeout: ${timeout}s)..."

  while [[ ${elapsed} -lt ${timeout} ]]; do
    local ready
    ready="$(kubectl get deployment "${deployment_name}" -n "${NAMESPACE}" \
      -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")"
    local desired
    desired="$(kubectl get deployment "${deployment_name}" -n "${NAMESPACE}" \
      -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")"

    if [[ "${ready}" -ge "${desired}" && "${desired}" -gt 0 ]]; then
      success "Deployment ${deployment_name} is ready (${ready}/${desired} replicas)"
      return 0
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  error "Deployment ${deployment_name} failed to become ready within ${timeout}s"
  return 1
}

run_smoke_tests() {
  local target_url="$1"
  local attempt=1

  info "Running smoke tests against ${target_url}..."

  while [[ ${attempt} -le ${SMOKE_TEST_RETRIES} ]]; do
    info "Smoke test attempt ${attempt}/${SMOKE_TEST_RETRIES}..."

    local health_code
    health_code="$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 \
      "${target_url}${HEALTH_ENDPOINT}" 2>/dev/null || echo "000")"

    if [[ "${health_code}" == "200" ]]; then
      success "Health check passed (HTTP ${health_code})"

      if [[ -x "${SMOKE_TEST_SCRIPT}" ]]; then
        info "Running full smoke test suite..."
        BASE_URL="${target_url}" bash "${SMOKE_TEST_SCRIPT}"
        local test_result=$?
        if [[ ${test_result} -eq 0 ]]; then
          success "All smoke tests passed"
          return 0
        else
          warn "Smoke test suite failed (attempt ${attempt})"
        fi
      else
        success "Basic health check passed"
        return 0
      fi
    else
      warn "Health check failed: HTTP ${health_code} (attempt ${attempt})"
    fi

    if [[ ${attempt} -lt ${SMOKE_TEST_RETRIES} ]]; then
      info "Retrying in ${SMOKE_TEST_INTERVAL}s..."
      sleep "${SMOKE_TEST_INTERVAL}"
    fi
    attempt=$((attempt + 1))
  done

  error "Smoke tests failed after ${SMOKE_TEST_RETRIES} attempts"
  return 1
}

switch_traffic() {
  local target_slot="$1"

  info "Switching traffic to ${target_slot}..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would switch traffic to ${target_slot}"
    return 0
  fi

  kubectl patch service "${SERVICE_NAME}" -n "${NAMESPACE}" \
    -p "{\"spec\":{\"selector\":{\"version\":\"${target_slot}\"}}}"

  success "Traffic switched to ${target_slot}"
}

rollback() {
  local previous_slot="$1"

  warn "ROLLING BACK to ${previous_slot}..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would rollback to ${previous_slot}"
    return 0
  fi

  switch_traffic "${previous_slot}"
  record_deployment "${previous_slot}" "${IMAGE_TAG}" "rollback"
  error "Deployment rolled back to ${previous_slot}"
}

deploy_to_slot() {
  local slot="$1"
  local deployment_name="gistpin-${slot}"
  local image="ghcr.io/pinspace-org/gistpin-backend:${IMAGE_TAG}"

  info "Deploying ${image} to ${slot} slot..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would deploy ${image} to ${deployment_name}"
    kubectl apply -f "${K8S_DIR}/${slot}-deployment.yaml" --dry-run=client 2>/dev/null || true
    return 0
  fi

  kubectl apply -f "${K8S_DIR}/${slot}-deployment.yaml"

  kubectl set image "deployment/${deployment_name}" \
    gistpin="${image}" \
    -n "${NAMESPACE}" 2>/dev/null || true

  wait_for_deployment "${deployment_name}" "${DEPLOY_TIMEOUT}"
}

main() {
  info "=== Blue-Green Deployment ==="
  info "Service: ${SERVICE_NAME}"
  info "Namespace: ${NAMESPACE}"
  info "Image Tag: ${IMAGE_TAG}"
  info "Dry Run: ${DRY_RUN}"

  local active_slot
  active_slot="$(get_active_slot)"
  local target_slot
  target_slot="$(get_inactive_slot)"

  info "Active slot: ${active_slot}"
  info "Target slot: ${target_slot}"

  if [[ "${DRY_RUN}" != "true" ]]; then
    kubectl get namespace "${NAMESPACE}" &>/dev/null || {
      error "Namespace ${NAMESPACE} does not exist"
      exit 1
    }
  fi

  record_deployment "${target_slot}" "${IMAGE_TAG}" "started"

  if ! deploy_to_slot "${target_slot}"; then
    error "Deployment to ${target_slot} failed"
    record_deployment "${target_slot}" "${IMAGE_TAG}" "failed"
    exit 1
  fi

  local smoke_url="${SMOKE_TEST_URL:-}"
  if [[ -z "${smoke_url}" ]]; then
    smoke_url="http://${target_slot}.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"
  fi

  if ! run_smoke_tests "${smoke_url}"; then
    error "Smoke tests failed for ${target_slot}"
    record_deployment "${target_slot}" "${IMAGE_TAG}" "smoke-test-failed"
    rollback "${active_slot}"
    exit 1
  fi

  if ! switch_traffic "${target_slot}"; then
    error "Traffic switch failed"
    record_deployment "${target_slot}" "${IMAGE_TAG}" "switch-failed"
    rollback "${active_slot}"
    exit 1
  fi

  record_deployment "${target_slot}" "${IMAGE_TAG}" "completed"

  success "=== Deployment Complete ==="
  success "Active slot: ${target_slot}"
  success "Previous slot: ${active_slot} (available for rollback)"

  if [[ "${ROLLBACK_WINDOW}" -gt 0 ]]; then
    info "Rollback window: ${ROLLBACK_WINDOW}s"
    info "Previous slot retained for manual rollback if needed"
  fi
}

main "$@"
