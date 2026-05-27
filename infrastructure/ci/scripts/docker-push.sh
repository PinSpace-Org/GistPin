#!/usr/bin/env bash
# docker-push.sh — Post-push tagging and verification.
# Called after the image has already been pushed by docker/build-push-action.
# Required env vars: IMAGE, TAG, BRANCH

set -euo pipefail

: "${IMAGE:?IMAGE env var is required}"
: "${TAG:?TAG env var is required}"
: "${BRANCH:?BRANCH env var is required}"

FULL_IMAGE="${IMAGE}:${TAG}"
BRANCH_IMAGE="${IMAGE}:${BRANCH}"

echo "✓ Pushed ${FULL_IMAGE}"
echo "✓ Pushed ${BRANCH_IMAGE}"
echo "  SHA tag  : ${TAG}"
echo "  Branch   : ${BRANCH}"
echo "  Registry : ${IMAGE%%/*}"
