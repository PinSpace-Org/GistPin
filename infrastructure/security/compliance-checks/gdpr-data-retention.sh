#!/usr/bin/env bash
# GDPR check: verify data-retention policy is configured
set -euo pipefail

RETENTION_CONFIG="infrastructure/k8s/cronjobs/cleanup.yaml"

if [[ ! -f "${RETENTION_CONFIG}" ]]; then
  echo "FAIL: data-retention cronjob config not found at ${RETENTION_CONFIG}"
  exit 1
fi

echo "PASS: data-retention policy config exists"
