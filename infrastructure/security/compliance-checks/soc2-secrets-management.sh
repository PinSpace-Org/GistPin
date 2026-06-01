#!/usr/bin/env bash
# SOC2 check: verify secrets are managed via sealed-secrets / external-secrets
set -euo pipefail

SEALED="infrastructure/k8s/sealed-secrets.yaml"
EXTERNAL="infrastructure/k8s/secrets/external-secrets.yaml"

if [[ ! -f "${SEALED}" && ! -f "${EXTERNAL}" ]]; then
  echo "FAIL: no secrets management config found"
  exit 1
fi

echo "PASS: secrets management config exists"
