#!/usr/bin/env bash
set -euo pipefail

ACTIVE_ENV="${1:-blue}"
if [[ "${ACTIVE_ENV}" != "blue" && "${ACTIVE_ENV}" != "green" ]]; then
  echo "Usage: switch-traffic.sh [blue|green]"
  exit 1
fi

if [[ "${ACTIVE_ENV}" == "blue" ]]; then
  NEW_ENV="green"
else
  NEW_ENV="blue"
fi

echo "Switching traffic from ${ACTIVE_ENV} to ${NEW_ENV}"
echo "${NEW_ENV}" > /tmp/gistpin-active-environment
echo "Traffic switched to ${NEW_ENV}"
