#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-http://localhost:3000/health}"

status_code="$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}")"
if [[ "${status_code}" != "200" ]]; then
  echo "Smoke test failed for ${TARGET_URL} with status ${status_code}"
  exit 1
fi

echo "Smoke test passed for ${TARGET_URL}"
