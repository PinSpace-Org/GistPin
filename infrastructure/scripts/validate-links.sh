#!/usr/bin/env bash
# validate-links.sh — check all markdown links in infrastructure/docs
set -euo pipefail

DOCS_DIR="${DOCS_DIR:-infrastructure/docs}"
FAILED=0

echo "=== Link Validation: ${DOCS_DIR} ==="

if command -v lychee &>/dev/null; then
  lychee --offline --no-progress "${DOCS_DIR}/**/*.md" 2>&1 || FAILED=1
else
  # Fallback: check internal markdown links only
  while IFS= read -r -d '' file; do
    while IFS= read -r line; do
      # Extract relative markdown links [text](path)
      if echo "${line}" | grep -qoP '\[.*?\]\((?!http)[^)]+\)'; then
        links=$(echo "${line}" | grep -oP '(?<=\()(?!http)[^)]+(?=\))')
        for link in ${links}; do
          target="${file%/*}/${link%%#*}"
          if [[ -n "${link%%#*}" && ! -f "${target}" ]]; then
            echo "  [BROKEN] ${file}: link to '${link}' not found"
            ((FAILED++)) || true
          fi
        done
      fi
    done < "${file}"
  done < <(find "${DOCS_DIR}" -name "*.md" -print0)
fi

echo ""
if [[ "${FAILED}" -eq 0 ]]; then
  echo "All links valid."
else
  echo "${FAILED} broken link(s) found."
  exit 1
fi
