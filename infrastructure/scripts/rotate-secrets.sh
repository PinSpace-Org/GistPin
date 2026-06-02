#!/usr/bin/env bash
set -euo pipefail

# rotate-secrets.sh — Zero-downtime secret rotation for GistPin
# Usage: ./rotate-secrets.sh [db|api|cert|all]

TARGET="${1:-all}"
AUDIT_LOG="/var/log/gistpin/secret-rotation-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$AUDIT_LOG")"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$AUDIT_LOG"; }

rotate_db_password() {
  log "Rotating database password..."
  NEW_PASS=$(openssl rand -base64 32)
  # Update in AWS Secrets Manager
  aws secretsmanager update-secret \
    --secret-id gistpin/db/password \
    --secret-string "$NEW_PASS"
  # Update PostgreSQL user
  psql -c "ALTER USER gistpin PASSWORD '$NEW_PASS';"
  # Restart backend pods to pick up new secret (zero-downtime rolling restart)
  kubectl rollout restart deployment/gistpin-backend
  kubectl rollout status deployment/gistpin-backend --timeout=120s
  log "Database password rotated successfully"
}

rotate_api_keys() {
  log "Rotating API keys..."
  NEW_KEY=$(openssl rand -hex 32)
  aws secretsmanager update-secret \
    --secret-id gistpin/api/key \
    --secret-string "$NEW_KEY"
  kubectl rollout restart deployment/gistpin-backend
  kubectl rollout status deployment/gistpin-backend --timeout=120s
  log "API keys rotated successfully"
}

rotate_certificates() {
  log "Rotating TLS certificates..."
  # Trigger cert-manager renewal
  kubectl annotate certificate gistpin-tls \
    cert-manager.io/issuer-kind=ClusterIssuer \
    --overwrite
  log "Certificate renewal triggered"
}

case "$TARGET" in
  db)   rotate_db_password ;;
  api)  rotate_api_keys ;;
  cert) rotate_certificates ;;
  all)
    rotate_db_password
    rotate_api_keys
    rotate_certificates
    ;;
  *) echo "Usage: $0 [db|api|cert|all]"; exit 1 ;;
esac

log "Secret rotation complete. Audit log: $AUDIT_LOG"
