#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

BACKUP_BUCKET="${BACKUP_BUCKET:-gistpin-etcd-backups}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/etcd-backups}"
ETCD_ENDPOINTS="${ETCD_ENDPOINTS:-https://127.0.0.1:2379}"
ETCD_CACERT="${ETCD_CACERT:-/etc/kubernetes/pki/etcd/ca.crt}"
ETCD_CERT="${ETCD_CERT:-/etc/kubernetes/pki/etcd/healthcheck-client.crt}"
ETCD_KEY="${ETCD_KEY:-/etc/kubernetes/pki/etcd/healthcheck-client.key}"
DRY_RUN="${DRY_RUN:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date -u +%Y-%m-%dT%H:%M:%SZ)]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Restore ETCD from a backup snapshot.

Options:
  -f, --file PATH          Local backup file to restore from
  -b, --bucket BUCKET      S3 bucket to download backup from
  -b, --backup-name NAME   Backup file name in S3
  --dry-run                Preview restore without executing
  -h, --help               Show this help message

WARNING: This operation is destructive. Always test in a non-production environment first.
EOF
  exit 0
}

BACKUP_FILE=""
BACKUP_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file) BACKUP_FILE="$2"; shift 2 ;;
    -b|--bucket) BACKUP_BUCKET="$2"; shift 2 ;;
    -n|--backup-name) BACKUP_NAME="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

check_prerequisites() {
  log "Checking prerequisites..."

  if ! command -v etcdctl >/dev/null 2>&1; then
    error "etcdctl is not installed"
    exit 1
  fi

  mkdir -p "${BACKUP_DIR}"

  if [[ -z "$BACKUP_FILE" && -z "$BACKUP_NAME" ]]; then
    error "Either --file or --backup-name is required"
    usage
  fi

  success "Prerequisites check passed"
}

download_from_s3() {
  if [[ -n "$BACKUP_FILE" ]]; then
    echo "$BACKUP_FILE"
    return
  fi

  log "Downloading backup from S3..."
  local local_file="${BACKUP_DIR}/${BACKUP_NAME}"

  if aws s3 cp "s3://${BACKUP_BUCKET}/etcd/${BACKUP_NAME}" "${local_file}" 2>/dev/null; then
    success "Downloaded: ${BACKUP_NAME}"
    echo "${local_file}"
  else
    error "Failed to download from S3"
    return 1
  fi
}

decompress_backup() {
  local backup_file="$1"

  if [[ "$backup_file" == *.gz ]]; then
    log "Decompressing backup..."
    local decompressed="${backup_file%.gz}"
    gunzip -k -f "$backup_file" 2>/dev/null || cp "$backup_file" "$decompressed"
    echo "$decompressed"
  elif [[ "$backup_file" == *.enc ]]; then
    log "Decrypting backup..."
    local decrypted="${backup_file%.enc}"
    if command -v openssl >/dev/null 2>&1; then
      local key="${ETCD_BACKUP_KEY:-}"
      if [[ -z "$key" ]]; then
        read -rsp "Enter backup decryption key: " key
        echo
      fi
      openssl enc -aes-256-cbc -d -salt -pbkdf2 \
        -in "$backup_file" \
        -out "$decrypted" \
        -pass pass:"${key}" 2>/dev/null
      echo "$decrypted"
    else
      error "openssl not available for decryption"
      return 1
    fi
  else
    echo "$backup_file"
  fi
}

verify_snapshot() {
  local snapshot_file="$1"

  log "Verifying snapshot integrity..."

  if etcdctl snapshot status "$snapshot_file" --write-out=table 2>/dev/null; then
    success "Snapshot is valid"
    return 0
  else
    error "Snapshot verification failed"
    return 1
  fi
}

stop_etcd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would stop ETCD"
    return 0
  fi

  log "Stopping ETCD..."
  if systemctl is-active etcd >/dev/null 2>&1; then
    systemctl stop etcd
    log "ETCD stopped"
  else
    warn "ETCD service not found or not managed by systemd"
  fi
}

restore_snapshot() {
  local snapshot_file="$1"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would restore from ${snapshot_file}"
    return 0
  fi

  log "Restoring ETCD from snapshot..."

  local data_dir="/var/lib/etcd"

  if [[ -d "${data_dir}" ]]; then
    log "Backing up current data directory..."
    mv "${data_dir}" "${data_dir}.bak.$(date -u +%Y%m%d-%H%M%S)"
  fi

  etcdctl snapshot restore "${snapshot_file}" \
    --data-dir="${data_dir}" \
    --name="$(hostname)" \
    --initial-cluster="$(hostname)=https://$(hostname):2380" \
    --initial-advertise-peer-urls="https://$(hostname):2380" 2>&1

  success "Snapshot restored to ${data_dir}"
}

start_etcd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would start ETCD"
    return 0
  fi

  log "Starting ETCD..."
  if systemctl is-enabled etcd >/dev/null 2>&1; then
    systemctl start etcd
    log "ETCD started"
  else
    warn "ETCD service not managed by systemd, please start manually"
  fi
}

verify_restore() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: Would verify restore"
    return 0
  fi

  log "Verifying restored ETCD..."

  sleep 5

  if etcdctl endpoint health \
    --endpoints="${ETCD_ENDPOINTS}" \
    --cacert="${ETCD_CACERT}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}" 2>/dev/null; then
    success "ETCD is healthy after restore"

    local member_count
    member_count=$(etcdctl member list \
      --endpoints="${ETCD_ENDPOINTS}" \
      --cacert="${ETCD_CACERT}" \
      --cert="${ETCD_CERT}" \
      --key="${ETCD_KEY}" 2>/dev/null | wc -l)
    log "ETCD member count: ${member_count}"

    return 0
  else
    error "ETCD health check failed after restore"
    return 1
  fi
}

main() {
  log "Starting ETCD restore..."
  log "WARNING: This operation is destructive and will overwrite current data"

  if [[ "$DRY_RUN" != "true" ]]; then
    echo -n "Are you sure you want to restore ETCD? (yes/no): "
    read -r confirm
    if [[ "$confirm" != "yes" ]]; then
      log "Restore cancelled"
      exit 0
    fi
  fi

  check_prerequisites

  local backup_file
  backup_file=$(download_from_s3)

  backup_file=$(decompress_backup "$backup_file")

  if ! verify_snapshot "$backup_file"; then
    error "Snapshot verification failed, aborting"
    exit 1
  fi

  stop_etcd
  restore_snapshot "$backup_file"
  start_etcd

  if ! verify_restore; then
    error "Restore verification failed"
    exit 1
  fi

  success "ETCD restore completed successfully"
}

main "$@"
