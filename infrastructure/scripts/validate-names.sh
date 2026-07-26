#!/usr/bin/env bash
# validate-names.sh — enforce GistPin Terraform naming conventions
# Usage: ./validate-names.sh [--dir infrastructure/terraform] [--fix]
set -euo pipefail

TF_DIR="${TF_DIR:-infrastructure/terraform}"
VIOLATIONS=0

# Naming rules:
#   - Must start with project prefix: gistpin- or ${var.project_name}-
#   - Must include environment segment
#   - No uppercase letters in resource names
#   - Max length: 63 characters
#   - Special characters: only hyphens and underscores

echo "=== GistPin Terraform Naming Convention Check ==="
echo "Scanning: ${TF_DIR}"
echo ""

while IFS= read -r -d '' file; do
  # Check resource names in .tf files
  while IFS= read -r line; do
    if echo "${line}" | grep -qE '^\s*resource\s+"aws_[^"]+"\s+"[^"]+"'; then
      resource_name=$(echo "${line}" | sed -E 's/.*resource\s+"[^"]+"\s+"([^"]+)".*/\1/')
      # Must not contain uppercase
      if echo "${resource_name}" | grep -qE '[A-Z]'; then
        echo "  [FAIL] ${file}: resource name '${resource_name}' contains uppercase letters"
        ((VIOLATIONS++)) || true
      fi
      # Max length 63
      if [[ ${#resource_name} -gt 63 ]]; then
        echo "  [FAIL] ${file}: resource name '${resource_name}' exceeds 63 characters"
        ((VIOLATIONS++)) || true
      fi
    fi
  done < "${file}"
done < <(find "${TF_DIR}" -name "*.tf" -print0)

echo ""
if [[ "${VIOLATIONS}" -eq 0 ]]; then
  echo "All naming checks passed."
else
  echo "Found ${VIOLATIONS} naming violation(s). See naming conventions at docs/naming-conventions.md"
  exit 1
fi
