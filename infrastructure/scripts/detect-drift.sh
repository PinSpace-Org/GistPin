#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
AUTO_REMEDIATE="${AUTO_REMEDIATE:-false}"
EXIT_CODE=0

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

mkdir -p "${REPORT_DIR}"

DRIFT_FILE="${REPORT_DIR}/drift-$(date -u +%Y%m%d-%H%M%S).json"

check_terraform_available() {
  if ! command -v terraform >/dev/null 2>&1; then
    log "ERROR: terraform is not installed."
    exit 1
  fi
}

run_terraform_plan() {
  log "Running terraform plan to detect drift in ${TERRAFORM_DIR}..."
  local plan_out
  plan_out="$(terraform -chdir="${TERRAFORM_DIR}" plan -detailed-exitcode -json 2>&1 || true)"
  echo "${plan_out}"
}

parse_drift() {
  local plan_json="$1"
  # Extract resource changes that are not no-op
  echo "${plan_json}" | jq -s '
    [.[] | select(.type == "planned_change") |
     select(.change.action != ["no-op"]) |
     {resource: .change.resource.addr, action: .change.action, reason: (.change.reason // "manual change")}
    ]
  ' 2>/dev/null || echo "[]"
}

check_k8s_drift() {
  log "Checking Kubernetes resource drift..."
  local drifted=()

  while IFS= read -r manifest; do
    local kind name namespace
    kind="$(grep -m1 '^kind:' "${manifest}" | awk '{print $2}')"
    name="$(grep -m1 '^\s*name:' "${manifest}" | awk '{print $2}')"
    namespace="$(grep -m1 '^\s*namespace:' "${manifest}" | awk '{print $2}' || echo "default")"

    if [[ -z "${kind}" || -z "${name}" ]]; then continue; fi

    local live_hash desired_hash
    live_hash="$(kubectl get "${kind}" "${name}" -n "${namespace:-default}" -o json 2>/dev/null \
      | jq 'del(.metadata.resourceVersion,.metadata.uid,.metadata.creationTimestamp,.status)' \
      | sha256sum | awk '{print $1}')" || live_hash="NOT_FOUND"
    desired_hash="$(kubectl apply --dry-run=server -f "${manifest}" -o json 2>/dev/null \
      | jq 'del(.metadata.resourceVersion,.metadata.uid,.metadata.creationTimestamp,.status)' \
      | sha256sum | awk '{print $1}')" || desired_hash="ERROR"

    if [[ "${live_hash}" != "${desired_hash}" ]]; then
      drifted+=("{\"manifest\":\"${manifest}\",\"kind\":\"${kind}\",\"name\":\"${name}\",\"namespace\":\"${namespace:-default}\"}")
      log "DRIFT: ${kind}/${name} in ${namespace:-default}"
    fi
  done < <(find infrastructure/k8s -name "*.yaml" -not -name "*.sample" 2>/dev/null)

  if [[ ${#drifted[@]} -gt 0 ]]; then
    IFS=,; echo "[${drifted[*]}]"
  else
    echo "[]"
  fi
}

send_alert() {
  local message="$1"
  log "ALERT: ${message}"
  if [[ -n "${SLACK_WEBHOOK}" ]]; then
    curl -s -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"[GistPin Drift] ${message}\"}" >/dev/null
  fi
}

remediate() {
  log "Auto-remediation enabled. Applying Terraform..."
  terraform -chdir="${TERRAFORM_DIR}" apply -auto-approve
  log "Terraform apply complete."
}

main() {
  check_terraform_available

  local tf_drift="[]"
  local k8s_drift="[]"

  # Terraform drift
  local plan_output
  plan_output="$(run_terraform_plan)"
  local tf_exit=$?

  if [[ ${tf_exit} -eq 2 ]]; then
    log "Terraform drift detected."
    tf_drift="$(parse_drift "${plan_output}")"
    EXIT_CODE=1
  elif [[ ${tf_exit} -eq 0 ]]; then
    log "No Terraform drift detected."
  else
    log "WARNING: terraform plan returned exit code ${tf_exit}."
    EXIT_CODE=1
  fi

  # Kubernetes drift
  if command -v kubectl >/dev/null 2>&1; then
    k8s_drift="$(check_k8s_drift)"
    if [[ "${k8s_drift}" != "[]" ]]; then
      EXIT_CODE=1
    fi
  else
    log "kubectl not available, skipping Kubernetes drift check."
  fi

  # Write report
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson terraform "${tf_drift}" \
    --argjson kubernetes "${k8s_drift}" \
    '{timestamp:$timestamp, terraform_drift:$terraform, kubernetes_drift:$kubernetes}' \
    > "${DRIFT_FILE}"

  log "Drift report written to ${DRIFT_FILE}"

  if [[ "${EXIT_CODE}" -ne 0 ]]; then
    local tf_count k8s_count
    tf_count="$(echo "${tf_drift}" | jq 'length')"
    k8s_count="$(echo "${k8s_drift}" | jq 'length')"
    send_alert "Drift detected: ${tf_count} Terraform resource(s), ${k8s_count} Kubernetes resource(s). See ${DRIFT_FILE}"

    if [[ "${AUTO_REMEDIATE}" == "true" ]]; then
      remediate
    fi
  else
    log "No drift detected."
  fi

  exit "${EXIT_CODE}"
}

main "$@"
