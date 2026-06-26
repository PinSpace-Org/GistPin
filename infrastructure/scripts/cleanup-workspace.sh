#!/usr/bin/env bash
# Destroys infrastructure and deletes a Terraform workspace after a PR merges/closes.
# Usage: cleanup-workspace.sh <workspace_name>
set -euo pipefail

WORKSPACE="${1:-}"
if [[ -z "$WORKSPACE" ]]; then
  echo "Error: workspace name required" >&2
  exit 1
fi

# Protect permanent workspaces
if [[ "$WORKSPACE" =~ ^(default|dev|staging|prod)$ ]]; then
  echo "Error: cannot delete protected workspace '$WORKSPACE'" >&2
  exit 1
fi

cd "$(dirname "$0")/../terraform"

terraform init -input=false -reconfigure

if ! terraform workspace list | grep -qE "^\s+$WORKSPACE\s*$"; then
  echo "Workspace $WORKSPACE does not exist — nothing to clean up"
  exit 0
fi

echo "==> Selecting workspace: $WORKSPACE"
terraform workspace select "$WORKSPACE"

echo "==> Destroying resources in workspace: $WORKSPACE"
terraform destroy -auto-approve -input=false

echo "==> Switching to default workspace"
terraform workspace select default

echo "==> Deleting workspace: $WORKSPACE"
terraform workspace delete "$WORKSPACE"

echo "Done — workspace $WORKSPACE removed"
