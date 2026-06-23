#!/usr/bin/env bash
# promote-artifact.sh — promote or rollback a versioned artifact between environments
# Usage: ./promote-artifact.sh --version 1.4.2 --from dev --to staging
#        ./promote-artifact.sh --rollback --env staging
set -euo pipefail

VERSION=""
FROM_ENV=""
TO_ENV=""
ROLLBACK=false
ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)  VERSION="$2";  shift 2 ;;
    --from)     FROM_ENV="$2"; shift 2 ;;
    --to)       TO_ENV="$2";   shift 2 ;;
    --rollback) ROLLBACK=true;  shift ;;
    --env)      ENV="$2";      shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ECR_REGISTRY="${AWS_ACCOUNT_ID:-123456789012}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com"
APP="gistpin-backend"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

retag_image() {
  local src_tag="$1"
  local dst_tag="$2"
  log "Retagging ${src_tag} → ${dst_tag}"

  MANIFEST=$(aws ecr batch-get-image \
    --repository-name "${APP}" \
    --image-ids imageTag="${src_tag}" \
    --query 'images[0].imageManifest' \
    --output text)

  aws ecr put-image \
    --repository-name "${APP}" \
    --image-tag "${dst_tag}" \
    --image-manifest "${MANIFEST}" \
    --output text > /dev/null
}

update_deployment() {
  local env="$1"
  local tag="$2"
  local kube_ctx="gistpin-${env}"

  log "Updating deployment in ${env} (context: ${kube_ctx}) to tag ${tag}"
  kubectl --context="${kube_ctx}" set image deployment/backend \
    "backend=${ECR_REGISTRY}/${APP}:${tag}" \
    --record=false

  kubectl --context="${kube_ctx}" rollout status deployment/backend \
    --timeout=300s
  log "Rollout complete in ${env}"
}

if [[ "$ROLLBACK" == "true" ]]; then
  [[ -z "$ENV" ]] && { echo "--env is required for rollback"; exit 1; }
  log "Rolling back ${ENV} to previous version..."
  kubectl --context="gistpin-${ENV}" rollout undo deployment/backend
  kubectl --context="gistpin-${ENV}" rollout status deployment/backend --timeout=300s
  log "Rollback complete"
  exit 0
fi

[[ -z "$VERSION" || -z "$FROM_ENV" || -z "$TO_ENV" ]] && {
  echo "Usage: $0 --version VERSION --from ENV --to ENV"
  exit 1
}

log "Promoting v${VERSION} from ${FROM_ENV} to ${TO_ENV}"

SRC_TAG="${FROM_ENV}-${VERSION}"
DST_TAG="${TO_ENV}-${VERSION}"

# Verify source image exists
aws ecr describe-images \
  --repository-name "${APP}" \
  --image-ids imageTag="${SRC_TAG}" \
  --output text > /dev/null

retag_image "${SRC_TAG}" "${DST_TAG}"
update_deployment "${TO_ENV}" "${DST_TAG}"

log "Promotion v${VERSION} ${FROM_ENV} → ${TO_ENV} SUCCEEDED"
