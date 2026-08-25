#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

BACKUP_BUCKET="${BACKUP_BUCKET:-gistpin-etcd-backups}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/etcd-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ETCD_ENDPOINTS="${ETCD_ENDPOINTS:-https://127.0.0.1:2379}"
ETCD_CACERT="${ETCD_CACERT:-/etc/kubernetes/pki/etcd/ca.crt}"
ETCD_CERT="${ETCD_CERT:-/etc/kubernetes/pki/etcd/healthcheck-client.crt}"
ETCD_KEY="${ETCD_KEY:-/etc/kubernetes/pki/etcd/healthcheck-client.key}"
ENCRYPT="${ENCRYPT:-true}"

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

Create an ETCD backup with encryption and S3 upload.

Options:
  -b, --bucket BUCKET       S3 bucket name
  -d, --dir DIR             Local backup directory
  -r, --retention DAYS      Retention period in days
  --no-upload               Skip S3 upload
  --no-encrypt              Skip encryption
  -h, --help                Show this help message
EOF
  exit 0
}

SKIP_UPLOAD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--bucket) BACKUP_BUCKET="$2"; shift 2 ;;
    -d|--dir) BACKUP_DIR="$2"; shift 2 ;;
    -r|--retention) RETENTION_DAYS="$2"; shift 2 ;;
    --no-upload) SKIP_UPLOAD=true; shift ;;
    --no-encrypt) ENCRYPT=false; shift ;;
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

  if [[ "$SKIP_UPLOAD" == "false" ]] && ! command -v aws >/dev/null 2>&1; then
    warn "AWS CLI not found, will skip S3 upload"
    SKIP_UPLOAD=true
  fi

  success "Prerequisites check passed"
}

verify_etcd_health() {
  log "Verifying ETCD health..."

  if etcdctl endpoint health \
    --endpoints="${ETCD_ENDPOINTS}" \
    --cacert="${ETCD_CACERT}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}" 2>/dev/null; then
    success "ETCD is healthy"
    return 0
  else
    error "ETCD health check failed"
    return 1
  fi
}

create_backup() {
  local timestamp
  timestamp="$(date -u +%Y%m%d-%H%M%S)"
  local backup_name="etcd-backup-${timestamp}"
  local backup_file="${BACKUP_DIR}/${backup_name}.db"

  log "Creating ETCD snapshot..."

  if ! etcdctl snapshot save "${backup_file}" \
    --endpoints="${ETCD_ENDPOINTS}" \
    --cacert="${ETCD_CACERT}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}"; then
    error "Failed to create ETCD snapshot"
    return 1
  fi

  log "Verifying snapshot..."
  local status_output
  status_output=$(etcdctl snapshot status "${backup_file}" --write-out=json 2>/dev/null)

  local db_size revision total_keys
  db_size=$(echo "$status_output" | jq -r '.dbSize // "unknown"')
  revision=$(echo "$status_output" | jq -r '.revision // "unknown"')
  total_keys=$(echo "$status_output" | jq -r '.totalKeys // "unknown"')

  log "Snapshot size: ${db_size} bytes"
  log "Revision: ${revision}"
  log "Total keys: ${total_keys}"

  log "Compressing backup..."
  gzip "${backup_file}"
  local compressed_file="${backup_file}.gz"
  local compressed_size
  compressed_size=$(stat -c%s "${compressed_file}" 2>/dev/null || stat -f%z "${compressed_file}" 2>/dev/null || echo "unknown")
  log "Compressed size: ${compressed_size} bytes"

  echo "${compressed_file}"
}

encrypt_backup() {
  local backup_file="$1"

  if [[ "$ENCRYPT" != "true" ]]; then
    echo "$backup_file"
    return
  fi

  log "Encrypting backup..."

  local encrypted_file="${backup_file}.enc"

  if command -v openssl >/dev/null 2>&1; then
    local key="${ETCD_BACKUP_KEY:-$(openssl rand -hex 32)}"
    openssl enc -aes-256-cbc -salt -pbkdf2 \
      -in "$backup_file" \
      -out "$encrypted_file" \
      -pass pass:"${key}" 2>/dev/null

    rm -f "$backup_file"
    log "Backup encrypted: ${encrypted_file}"
    echo "${encrypted_file}"
  else
    warn "openssl not available, skipping encryption"
    echo "$backup_file"
  fi
}

upload_to_s3() {
  local backup_file="$1"

  if [[ "$SKIP_UPLOAD" == "true" ]]; then
    log "Skipping S3 upload"
    return 0
  fi

  log "Uploading to S3..."

  local filename
  filename=$(basename "$backup_file")

  if aws s3 cp "$backup_file" "s3://${BACKUP_BUCKET}/etcd/${filename}" \
    --sse aws:kms 2>/dev/null; then
    success "Uploaded to s3://${BACKUP_BUCKET}/etcd/${filename}"
  else
    error "Failed to upload to S3"
    return 1
  fi
}

cleanup_old_backups() {
  log "Cleaning up local backups older than ${RETENTION_DAYS} days..."

  local deleted=0
  while IFS= read -r old_file; do
    rm -f "$old_file"
    deleted=$((deleted + 1))
  done < <(find "${BACKUP_DIR}" -name "etcd-backup-*.db.gz*" -mtime "+${RETENTION_DAYS}" 2>/dev/null)

  if [[ $deleted -gt 0 ]]; then
    log "Cleaned up ${deleted} old backup files"
  fi

  if [[ "$SKIP_UPLOAD" == "false" ]] && command -v aws >/dev/null 2>&1; then
    log "Cleaning up S3 backups older than ${RETENTION_DAYS} days..."
    local cutoff_date
    cutoff_date=$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -u -v-${RETENTION_DAYS}d +%Y-%m-%d)

    aws s3 ls "s3://${BACKUP_BUCKET}/etcd/" 2>/dev/null | \
      awk -v cutoff="$cutoff_date" '$1 < cutoff {print $4}' | \
      while read -r file; do
        if [[ -n "$file" ]]; then
          aws s3 rm "s3://${BACKUP_BUCKET}/etcd/${file}" 2>/dev/null || true
        fi
      done
  fi
}

main() {
  log "Starting ETCD backup..."
  log "Endpoints: ${ETCD_ENDPOINTS}"
  log "Bucket: ${BACKUP_BUCKET}"

  check_prerequisites
  verify_etcd_health

  local backup_file
  backup_file=$(create_backup)

  backup_file=$(encrypt_backup "$backup_file")

  upload_to_s3 "$backup_file"

  cleanup_old_backups

  success "ETCD backup completed: $(basename "$backup_file")"
}

main "$@"
