#!/usr/bin/env bash
# acquire-resource-lock.sh - Acquire dependency-aware locks before a Terraform
#                            operation on a resource group.
#
# Acquires a lock for the requested group AND all of its transitive
# dependencies, always in the fixed global order (deadlock prevention), with a
# per-lock timeout. Release with --release; inspect with --status.
#
# Usage:
#   ./acquire-resource-lock.sh --group database            # acquire
#   ./acquire-resource-lock.sh --group database --release  # release
#   ./acquire-resource-lock.sh --status                    # show held locks
#
# Environment:
#   LOCK_TABLE     DynamoDB table (default from terraform output resource_lock_table)
#   LOCK_TTL       Lock lifetime in seconds (default 900)
#   LOCK_TIMEOUT   Max seconds to wait to acquire a contended lock (default 300)
#   HOLDER         Identity recorded on the lock (default: user@host or CI run id)
set -euo pipefail

LOCK_TTL="${LOCK_TTL:-900}"
LOCK_TIMEOUT="${LOCK_TIMEOUT:-300}"
HOLDER="${HOLDER:-${USER:-unknown}@$(hostname)}"
GROUP=""
ACTION="acquire"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --group)   GROUP="$2"; shift 2 ;;
    --release) ACTION="release"; shift ;;
    --status)  ACTION="status"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

command -v aws >/dev/null || { echo "aws CLI not found" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }

LOCK_TABLE="${LOCK_TABLE:-$(terraform output -raw resource_lock_table 2>/dev/null || echo '')}"
[[ -z "$LOCK_TABLE" ]] && { echo "LOCK_TABLE not set and terraform output unavailable" >&2; exit 1; }

GRAPH_JSON="$(terraform output -raw resource_dependency_graph 2>/dev/null || echo '{}')"

# Resolve the ordered set of groups to lock: the requested group plus its
# transitive dependencies, sorted by the global lock order.
resolve_lock_set() {
  local group="$1"
  echo "$GRAPH_JSON" | jq -r --arg g "$group" '
    . as $graph
    | def deps($n): ($graph.dependencies[$n] // []) as $d
        | $d + ([$d[] | deps(.)] | add // []);
    ([$g] + deps($g)) | unique as $needed
    | $graph.order | map(select(. as $o | $needed | index($o)))
    | .[]
  '
}

# Atomic acquire via conditional PutItem: succeeds only if no unexpired lock
# exists for LockID.
try_acquire_one() {
  local lock_id="$1"
  local now expires
  now="$(date +%s)"
  expires="$((now + LOCK_TTL))"
  aws dynamodb put-item \
    --table-name "$LOCK_TABLE" \
    --item "{\"LockID\":{\"S\":\"$lock_id\"},\"Holder\":{\"S\":\"$HOLDER\"},\"ExpiresAt\":{\"N\":\"$expires\"},\"AcquiredAt\":{\"N\":\"$now\"}}" \
    --condition-expression "attribute_not_exists(LockID) OR ExpiresAt < :now" \
    --expression-attribute-values "{\":now\":{\"N\":\"$now\"}}" \
    >/dev/null 2>&1
}

acquire_with_timeout() {
  local lock_id="$1"
  local deadline=$(( $(date +%s) + LOCK_TIMEOUT ))
  until try_acquire_one "$lock_id"; do
    if [[ $(date +%s) -ge $deadline ]]; then
      echo "TIMEOUT acquiring lock '$lock_id' after ${LOCK_TIMEOUT}s (held by another operation)" >&2
      return 1
    fi
    sleep 5
  done
  echo "  locked: $lock_id"
}

release_one() {
  local lock_id="$1"
  # Only release a lock we hold.
  aws dynamodb delete-item \
    --table-name "$LOCK_TABLE" \
    --key "{\"LockID\":{\"S\":\"$lock_id\"}}" \
    --condition-expression "Holder = :h" \
    --expression-attribute-values "{\":h\":{\"S\":\"$HOLDER\"}}" \
    >/dev/null 2>&1 && echo "  released: $lock_id" || echo "  not held by us (skipped): $lock_id"
}

case "$ACTION" in
  acquire)
    [[ -z "$GROUP" ]] && { echo "--group is required to acquire" >&2; exit 1; }
    mapfile -t LOCK_SET < <(resolve_lock_set "$GROUP")
    echo "Acquiring locks for '$GROUP' (+deps) in order: ${LOCK_SET[*]}"
    ACQUIRED=()
    for lock in "${LOCK_SET[@]}"; do
      if acquire_with_timeout "$lock"; then
        ACQUIRED+=("$lock")
      else
        # Roll back any locks we already took so we never hold a partial set.
        echo "Rolling back partial acquisition..." >&2
        for held in "${ACQUIRED[@]}"; do release_one "$held"; done
        exit 1
      fi
    done
    echo "All locks acquired."
    ;;
  release)
    [[ -z "$GROUP" ]] && { echo "--group is required to release" >&2; exit 1; }
    mapfile -t LOCK_SET < <(resolve_lock_set "$GROUP")
    # Release in reverse order.
    for (( i=${#LOCK_SET[@]}-1; i>=0; i-- )); do release_one "${LOCK_SET[$i]}"; done
    echo "Released."
    ;;
  status)
    echo "Currently held locks in ${LOCK_TABLE}:"
    aws dynamodb scan --table-name "$LOCK_TABLE" \
      | jq -r '.Items[] | "  \(.LockID.S)\tholder=\(.Holder.S)\texpires=\(.ExpiresAt.N)"'
    ;;
esac
