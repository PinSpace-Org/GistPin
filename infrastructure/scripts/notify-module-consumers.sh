#!/usr/bin/env bash
# =============================================================================
# notify-module-consumers.sh
# Issue #1129: Terraform module deprecation workflow
#
# Finds all Terraform files that reference deprecated modules and prints
# notification messages so engineers know they need to migrate.
#
# Usage:
#   bash infrastructure/scripts/notify-module-consumers.sh [--root <path>] [--strict]
#
# Options:
#   --root <path>   Root directory to search (default: repository root)
#   --strict        Exit 1 if any deprecated module usages are found (for CI)
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SEARCH_ROOT="${REPO_ROOT}"
STRICT_MODE=false
SUNSET_DATE="2026-11-01"
MIGRATION_DOC="infrastructure/docs/module-deprecation.md"

# Map of deprecated module path patterns to their replacement
declare -A DEPRECATED_MODULES=(
  ["deprecated-modules/legacy-vpc"]="modules/networking/vpc"
  ["deprecated-modules/old-ecs-service"]="modules/compute/ecs-service"
  ["deprecated-modules/basic-rds"]="modules/database/rds-cluster"
  ["deprecated-modules/static-site-s3"]="modules/storage/static-site"
)

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      SEARCH_ROOT="$2"
      shift 2
      ;;
    --strict)
      STRICT_MODE=true
      shift
      ;;
    -h|--help)
      grep '^#' "$0" | head -20 | sed 's/^# \{0,2\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
print_header() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║         Terraform Deprecated Module Consumer Scan            ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Search root : ${SEARCH_ROOT}"
  echo "  Sunset date : ${SUNSET_DATE}"
  echo "  Migration   : ${MIGRATION_DOC}"
  echo ""
}

print_finding() {
  local module_pattern="$1"
  local replacement="$2"
  local file="$3"
  local line_num="$4"
  local line_content="$5"

  echo "  ⚠️  DEPRECATED MODULE USAGE FOUND"
  echo "     File       : ${file}"
  echo "     Line       : ${line_num}"
  echo "     Usage      : $(echo "${line_content}" | xargs)"
  echo "     Replace with: source = \".../${replacement}\""
  echo "     Sunset      : ${SUNSET_DATE}"
  echo ""
}

# ---------------------------------------------------------------------------
# Main scan
# ---------------------------------------------------------------------------
print_header

found_count=0
file_count=0

echo "Scanning for deprecated module references..."
echo ""

for module_pattern in "${!DEPRECATED_MODULES[@]}"; do
  replacement="${DEPRECATED_MODULES[$module_pattern]}"

  # Search all .tf files for references to this deprecated module
  while IFS=: read -r file line_num line_content; do
    # Skip the deprecated-modules directory itself (README, placeholder files)
    if [[ "${file}" == *"deprecated-modules/"* ]]; then
      continue
    fi

    print_finding "${module_pattern}" "${replacement}" "${file}" "${line_num}" "${line_content}"
    (( found_count++ )) || true

  done < <(grep -rn --include="*.tf" "${module_pattern}" "${SEARCH_ROOT}" 2>/dev/null || true)
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "══════════════════════════════════════════════════════════════"
if [[ "${found_count}" -eq 0 ]]; then
  echo "  ✅  No deprecated module usages found. You're all set!"
else
  echo "  ❌  Found ${found_count} reference(s) to deprecated module(s)."
  echo ""
  echo "  Action required:"
  echo "  1. Review each file listed above."
  echo "  2. Follow the migration guide:"
  echo "     ${REPO_ROOT}/${MIGRATION_DOC}"
  echo "  3. Update source paths to replacement modules."
  echo "  4. Run \`terraform init -upgrade\` after updating sources."
  echo ""
  echo "  Need help? Ping @infra-platform in Slack or open a GitHub"
  echo "  Discussion tagged #terraform-migration."
fi
echo "══════════════════════════════════════════════════════════════"
echo ""

# Exit 1 in strict/CI mode if any usages found
if [[ "${STRICT_MODE}" == "true" && "${found_count}" -gt 0 ]]; then
  echo "Exiting with code 1 (--strict mode: deprecated module usages detected)" >&2
  exit 1
fi

exit 0
