#!/usr/bin/env bash
# Ephemeral Container Debugging Script for GistPin
# Manages ephemeral debug containers for live pod debugging
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

NAMESPACE="${NAMESPACE:-gistpin}"
POD_NAME="${POD_NAME:-}"
CONTAINER_NAME="${CONTAINER_NAME:-debug-$(date +%s)}"
DEBUG_IMAGE="${DEBUG_IMAGE:-nicolaka/netshoot:latest}"
SHELL="${SHELL:-/bin/bash}"
TIMEOUT="${TIMEOUT:-3600}"
INTERACTIVE="${INTERACTIVE:-true}"
AUDIT_LOG="${AUDIT_LOG:-/var/log/gistpin/debug-audit.log}"
DRY_RUN="${DRY_RUN:-false}"

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

APPROVED_IMAGES=(
  "busybox:latest"
  "nicolaka/netshoot:latest"
  "curlimages/curl:latest"
  "alpine:latest"
  "python:3.11-slim"
  "node:18-slim"
)

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Ephemeral Container Debugging for GistPin

Options:
  -p, --pod NAME          Target pod name (required)
  -n, --namespace NS      Kubernetes namespace (default: gistpin)
  -i, --image IMAGE       Debug container image (default: nicolaka/netshoot:latest)
  -c, --container NAME    Debug container name (default: debug-<timestamp>)
  -s, --shell PATH        Shell to use (default: /bin/bash)
  -t, --timeout SECS      Debug session timeout (default: 3600)
  --non-interactive       Run in non-interactive mode
  --dry-run               Show what would be done without executing
  --list-images           List approved debug images
  --cleanup               Clean up all debug containers in namespace
  -h, --help              Show this help message

Environment Variables:
  NAMESPACE               Target Kubernetes namespace
  POD_NAME                Target pod name
  DEBUG_IMAGE             Debug container image
  KUBECONFIG              Path to kubeconfig file

Examples:
  $0 -p my-pod-abc123 -n gistpin-prod
  $0 -p my-pod-abc123 -i busybox:latest -s /bin/sh
  $0 --list-images
  $0 --cleanup -n gistpin-prod
EOF
  exit 0
}

audit_log() {
  local action="$1"
  local pod="$2"
  local namespace="$3"
  local image="$4"
  local status="$5"

  local log_entry
  log_entry="$(cat <<LOGEOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "action": "${action}",
  "user": "$(whoami)",
  "namespace": "${namespace}",
  "pod": "${pod}",
  "container": "${CONTAINER_NAME}",
  "image": "${image}",
  "status": "${status}",
  "timeout": "${TIMEOUT}"
}
LOGEOF
)"

  mkdir -p "$(dirname "${AUDIT_LOG}")" 2>/dev/null || true
  echo "${log_entry}" >> "${AUDIT_LOG}" 2>/dev/null || true

  info "Audit: ${action} on ${namespace}/${pod} by $(whoami)"
}

validate_image() {
  local image="$1"

  for approved in "${APPROVED_IMAGES[@]}"; do
    if [[ "${image}" == "${approved}" ]]; then
      return 0
    fi
  done

  error "Image '${image}' is not in the approved list"
  info "Approved images:"
  for approved in "${APPROVED_IMAGES[@]}"; do
    info "  - ${approved}"
  done
  return 1
}

list_approved_images() {
  info "=== Approved Debug Images ==="
  for image in "${APPROVED_IMAGES[@]}"; do
    info "  - ${image}"
  done
}

check_ephemeral_containers_feature() {
  info "Checking ephemeral containers feature..."

  if kubectl api-resources | grep -q "ephemeralcontainers"; then
    success "Ephemeral containers API is available"
    return 0
  fi

  warn "Ephemeral containers API not directly available"
  info "Attempting to use kubectl debug instead..."

  if kubectl debug --help &>/dev/null; then
    success "kubectl debug is available"
    return 0
  fi

  error "Neither ephemeral containers API nor kubectl debug available"
  return 1
}

get_pod_info() {
  local pod="$1"
  local namespace="$2"

  local pod_info
  pod_info="$(kubectl get pod "${pod}" -n "${namespace}" -o json 2>/dev/null)"

  if [[ -z "${pod_info}" ]]; then
    error "Pod '${pod}' not found in namespace '${namespace}'"
    return 1
  fi

  local status
  status="$(echo "${pod_info}" | jq -r '.status.phase')"

  local node
  node="$(echo "${pod_info}" | jq -r '.spec.nodeName')"

  info "Pod: ${pod}"
  info "Namespace: ${namespace}"
  info "Status: ${status}"
  info "Node: ${node}"
}

create_ephemeral_container() {
  local pod="$1"
  local namespace="$2"
  local image="$3"

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[DRY RUN] Would create ephemeral container in ${namespace}/${pod}"
    info "[DRY RUN] Image: ${image}"
    info "[DRY RUN] Container name: ${CONTAINER_NAME}"
    return 0
  fi

  info "Creating ephemeral container '${CONTAINER_NAME}' in ${namespace}/${pod}..."

  local json_patch
  json_patch="$(cat <<PATCH
{
  "spec": {
    "ephemeralContainers": [{
      "name": "${CONTAINER_NAME}",
      "image": "${image}",
      "stdin": true,
      "tty": true,
      "command": ["${SHELL}"],
      "env": [
        {"name": "POD_NAME", "value": "${pod}"},
        {"name": "POD_NAMESPACE", "value": "${namespace}"},
        {"name": "DEBUG_TIMEOUT", "value": "${TIMEOUT}"}
      ],
      "resources": {
        "requests": {"cpu": "50m", "memory": "64Mi"},
        "limits": {"cpu": "200m", "memory": "128Mi"}
      },
      "securityContext": {
        "capabilities": {"add": ["SYS_PTRACE"]},
        "runAsUser": 0
      }
    }]
  }
}
PATCH
)"

  if kubectl replace --raw "/api/v1/namespaces/${namespace}/pods/${pod}/ephemeralcontainers" \
    -f - <<< "${json_patch}" &>/dev/null; then
    success "Ephemeral container created"
    audit_log "create_ephemeral_container" "${pod}" "${namespace}" "${image}" "success"
    return 0
  fi

  warn "Direct API method failed, trying kubectl debug..."

  if kubectl debug -it "${pod}" \
    --namespace="${namespace}" \
    --image="${image}" \
    --target="${CONTAINER_NAME}" \
    -- /bin/sh; then
    success "Debug session completed"
    audit_log "debug_session" "${pod}" "${namespace}" "${image}" "completed"
    return 0
  fi

  error "Failed to create ephemeral container"
  audit_log "create_ephemeral_container" "${pod}" "${namespace}" "${image}" "failed"
  return 1
}

cleanup_debug_containers() {
  local namespace="$1"

  info "Cleaning up debug containers in namespace ${namespace}..."

  local pods
  pods="$(kubectl get pods -n "${namespace}" -o json 2>/dev/null)"

  local count=0
  while IFS= read -r pod; do
    local debug_containers
    debug_containers="$(echo "${pods}" | jq -r --arg pod "${pod}" \
      '.items[] | select(.metadata.name == $pod) | .spec.ephemeralContainers[]?.name // empty' 2>/dev/null)"

    if [[ -n "${debug_containers}" ]]; then
      while IFS= read -r container; do
        info "Removing debug container '${container}' from pod '${pod}'..."
        # Note: Ephemeral containers cannot be removed once added
        # This logs the cleanup action for audit purposes
        audit_log "cleanup_attempt" "${pod}" "${namespace}" "${container}" "logged"
        count=$((count + 1))
      done <<< "${debug_containers}"
    fi
  done < <(echo "${pods}" | jq -r '.items[].metadata.name' 2>/dev/null)

  info "Found ${count} debug container(s) for cleanup review"
  info "Note: Ephemeral containers persist until pod termination"
}

monitor_debug_session() {
  local pod="$1"
  local namespace="$2"

  info "Monitoring debug session (timeout: ${TIMEOUT}s)..."
  info "Press Ctrl+C to exit"

  local elapsed=0
  while [[ ${elapsed} -lt ${TIMEOUT} ]]; do
    local pod_status
    pod_status="$(kubectl get pod "${pod}" -n "${namespace}" -o jsonpath='{.status.phase}' 2>/dev/null)"

    if [[ "${pod_status}" != "Running" ]]; then
      warn "Pod status changed to ${pod_status}"
      break
    fi

    sleep 10
    elapsed=$((elapsed + 10))

    if ((elapsed % 60 == 0)); then
      info "Session active: ${elapsed}s / ${TIMEOUT}s"
    fi
  done

  info "Debug session ended"
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -p|--pod)           POD_NAME="$2"; shift 2 ;;
      -n|--namespace)     NAMESPACE="$2"; shift 2 ;;
      -i|--image)         DEBUG_IMAGE="$2"; shift 2 ;;
      -c|--container)     CONTAINER_NAME="$2"; shift 2 ;;
      -s|--shell)         SHELL="$2"; shift 2 ;;
      -t|--timeout)       TIMEOUT="$2"; shift 2 ;;
      --non-interactive)  INTERACTIVE="false"; shift ;;
      --dry-run)          DRY_RUN="true"; shift ;;
      --list-images)      list_approved_images; exit 0 ;;
      --cleanup)          cleanup_debug_containers "${NAMESPACE}"; exit 0 ;;
      -h|--help)          usage ;;
      *)                  error "Unknown option: $1"; usage ;;
    esac
  done

  if [[ -z "${POD_NAME}" ]]; then
    error "Pod name is required (-p/--pod)"
    usage
  fi

  info "=== Ephemeral Container Debugging ==="
  info "Target: ${NAMESPACE}/${POD_NAME}"
  info "Image: ${DEBUG_IMAGE}"
  info "Container: ${CONTAINER_NAME}"

  validate_image "${DEBUG_IMAGE}" || exit 1

  check_ephemeral_containers_feature || exit 1

  get_pod_info "${POD_NAME}" "${NAMESPACE}" || exit 1

  audit_log "debug_session_start" "${POD_NAME}" "${NAMESPACE}" "${DEBUG_IMAGE}" "initiated"

  if create_ephemeral_container "${POD_NAME}" "${NAMESPACE}" "${DEBUG_IMAGE}"; then
    if [[ "${INTERACTIVE}" == "true" && "${DRY_RUN}" != "true" ]]; then
      info "Attaching to debug container..."
      kubectl attach "${POD_NAME}" -n "${NAMESPACE}" -c "${CONTAINER_NAME}" -it 2>/dev/null || true
    fi

    monitor_debug_session "${POD_NAME}" "${NAMESPACE}"

    audit_log "debug_session_end" "${POD_NAME}" "${NAMESPACE}" "${DEBUG_IMAGE}" "completed"
    success "Debug session completed"
  else
    audit_log "debug_session_end" "${POD_NAME}" "${NAMESPACE}" "${DEBUG_IMAGE}" "failed"
    exit 1
  fi
}

main "$@"
