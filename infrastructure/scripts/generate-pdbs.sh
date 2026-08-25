#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

K8S_DIR="${K8S_DIR:-infrastructure/k8s}"
OUTPUT_DIR="${OUTPUT_DIR:-infrastructure/k8s/automation}"
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

Automatically generate PodDisruptionBudgets from deployment metadata.

Options:
  -d, --dir DIR         K8s manifests directory (default: infrastructure/k8s)
  -o, --output DIR      Output directory for generated PDBs
  -n, --namespace NS    Target namespace (default: gistpin)
  -m, --min-available N Default minAvailable if not calculable
  --dry-run             Show what would be generated without writing files
  -h, --help            Show this help message
EOF
  exit 0
}

NAMESPACE="gistpin"
MIN_AVAILABLE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dir) K8S_DIR="$2"; shift 2 ;;
    -o|--output) OUTPUT_DIR="$2"; shift 2 ;;
    -n|--namespace) NAMESPACE="$2"; shift 2 ;;
    -m|--min-available) MIN_AVAILABLE="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

calculate_min_available() {
  local replicas=$1
  if [[ -n "$MIN_AVAILABLE" ]]; then
    echo "$MIN_AVAILABLE"
    return
  fi

  if [[ $replicas -le 1 ]]; then
    echo ""
    return
  fi

  echo $(( (replicas + 1) / 2 ))
}

discover_deployments() {
  log "Discovering deployments in ${K8S_DIR}..."

  local deployments=()

  while IFS= read -r manifest; do
    local kind
    kind=$(grep -m1 '^kind:' "$manifest" | awk '{print $2}' 2>/dev/null || echo "")
    if [[ "$kind" != "Deployment" ]]; then continue; fi

    local name namespace replicas
    name=$(grep -m1 '^\s*name:' "$manifest" | awk '{print $2}' 2>/dev/null || echo "")
    namespace=$(grep -m1 '^\s*namespace:' "$manifest" | awk '{print $2}' 2>/dev/null || echo "default")
    replicas=$(grep -m1 '^\s*replicas:' "$manifest" | awk '{print $2}' 2>/dev/null || echo "1")

    if [[ -z "$name" || "$namespace" != "$NAMESPACE" ]]; then continue; fi

    echo "${manifest}:${name}:${replicas}"
  done < <(find "$K8S_DIR" -name "*.yaml" -not -name "*.sample" 2>/dev/null)
}

check_existing_pdb() {
  local name=$1
  while IFS= read -r pdb_file; do
    if grep -q "name: ${name}" "$pdb_file" 2>/dev/null; then
      return 0
    fi
  done < <(find "$K8S_DIR" -name "pdb*.yaml" -o -name "*-pdb.yaml" 2>/dev/null)
  return 1
}

generate_pdb() {
  local name=$1
  local min_available=$2

  cat <<EOF
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ${name}-pdb
  namespace: ${NAMESPACE}
  labels:
    app: ${name}
    managed-by: pdb-automation
  annotations:
    pdb-automation/policy: "auto-generated"
    pdb-automation/min-available: "${min_available}"
spec:
  minAvailable: ${min_available}
  selector:
    matchLabels:
      app: ${name}
EOF
}

main() {
  mkdir -p "${OUTPUT_DIR}"

  local count=0
  local skipped=0
  local generated=0

  while IFS=: read -r manifest name replicas; do
    if [[ -z "$name" ]]; then continue; fi
    count=$((count + 1))

    if [[ $replicas -le 1 ]]; then
      log "SKIP: ${name} (${replicas} replica) - single-replica service"
      skipped=$((skipped + 1))
      continue
    fi

    if check_existing_pdb "$name"; then
      log "SKIP: ${name} - PDB already exists"
      skipped=$((skipped + 1))
      continue
    fi

    local min_available
    min_available=$(calculate_min_available "$replicas")

    if [[ -z "$min_available" ]]; then
      log "SKIP: ${name} - cannot calculate minAvailable"
      skipped=$((skipped + 1))
      continue
    fi

    local pdb_output="${OUTPUT_DIR}/pdb-${name}.yaml"

    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN: Would generate PDB for ${name} (minAvailable: ${min_available})"
      generate_pdb "$name" "$min_available"
    else
      generate_pdb "$name" "$min_available" > "$pdb_output"
      success "Generated PDB: ${pdb_output} (minAvailable: ${min_available})"
      generated=$((generated + 1))
    fi
  done < <(discover_deployments)

  log "Summary: ${count} deployments found, ${generated} PDBs generated, ${skipped} skipped"
}

main "$@"
