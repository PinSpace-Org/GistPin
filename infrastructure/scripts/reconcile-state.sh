#!/usr/bin/env bash
# reconcile-state.sh - Reconcile drift between Terraform state and actual
#                      resource configuration (esp. after `terraform import`).
#
# Workflow:
#   1. Refresh + plan to detect drift.
#   2. Categorize drift (in-place update / replacement / delete / import-needed).
#   3. Generate fix configurations via generate-fix-configs.py.
#   4. Emit a reconciliation report.
#   5. Optionally apply the reconciliation (guarded).
#
# Usage:
#   ./reconcile-state.sh                 # detect + report (no changes)
#   ./reconcile-state.sh --apply         # apply reconciliation after review
set -euo pipefail

APPLY="false"
[[ "${1:-}" == "--apply" ]] && APPLY="true"

OUT_DIR="${OUT_DIR:-./reconciliation}"
PLAN_BIN="${OUT_DIR}/drift.tfplan"
PLAN_JSON="${OUT_DIR}/drift.plan.json"
REPORT="${OUT_DIR}/reconciliation-report.md"
FIXES="${OUT_DIR}/fixes.generated.tf"

command -v terraform >/dev/null || { echo "terraform not found" >&2; exit 1; }
mkdir -p "$OUT_DIR"

echo "=== Terraform State Reconciliation ==="

# 1. Detect drift. -refresh-only surfaces state-vs-real differences; a full plan
#    surfaces config-vs-state differences. We capture the full plan for the
#    richest categorization.
echo "Planning to detect drift..."
set +e
terraform plan -refresh=true -out="$PLAN_BIN" -detailed-exitcode >/dev/null
PLAN_EXIT=$?
set -e

# detailed-exitcode: 0 = no changes, 2 = changes present, 1 = error.
if [[ $PLAN_EXIT -eq 1 ]]; then
  echo "terraform plan failed" >&2
  exit 1
fi
if [[ $PLAN_EXIT -eq 0 ]]; then
  echo "No drift detected; state matches configuration."
  exit 0
fi

terraform show -json "$PLAN_BIN" > "$PLAN_JSON"

# 2 & 3. Categorize drift and generate fix configs + report.
echo "Categorizing drift and generating fix configurations..."
python3 "$(dirname "$0")/generate-fix-configs.py" \
  --plan-json "$PLAN_JSON" \
  --report "$REPORT" \
  --fixes "$FIXES"

echo ""
echo "Reconciliation report: $REPORT"
echo "Generated fixes:       $FIXES"
echo ""
cat "$REPORT"

# 5. Apply (guarded).
if [[ "$APPLY" == "true" ]]; then
  echo ""
  echo "Applying reconciliation from saved plan..."
  # Apply the exact reviewed plan so nothing new sneaks in between plan+apply.
  terraform apply "$PLAN_BIN"
  echo "Reconciliation applied."
else
  echo ""
  echo "Dry run only. Review the report and fixes, then re-run with --apply."
fi
