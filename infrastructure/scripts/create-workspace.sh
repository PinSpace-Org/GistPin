#!/usr/bin/env bash
# Creates an isolated Terraform workspace for a CI run (PR or branch).
# Usage: create-workspace.sh <workspace_name>
set -euo pipefail

WORKSPACE="${1:-}"
if [[ -z "$WORKSPACE" ]]; then
  echo "Error: workspace name required" >&2
  exit 1
fi

cd "$(dirname "$0")/../terraform"

echo "==> Initialising Terraform backend"
terraform init -input=false -reconfigure

echo "==> Creating workspace: $WORKSPACE"
if terraform workspace list | grep -qE "^\s+$WORKSPACE\s*$"; then
  echo "Workspace $WORKSPACE already exists — selecting"
  terraform workspace select "$WORKSPACE"
else
  terraform workspace new "$WORKSPACE"
fi

echo "==> Active workspace: $(terraform workspace show)"
echo "TERRAFORM_WORKSPACE=$WORKSPACE" >> "${GITHUB_ENV:-/dev/null}" 2>/dev/null || true
