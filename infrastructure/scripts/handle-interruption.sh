#!/usr/bin/env bash
# Handles AWS EC2 spot instance interruption notices.
# Polls the IMDS, cordons the node, evicts pods, and notifies.
# Designed to run inside the spot-handler DaemonSet pod.
set -euo pipefail

NODE_NAME="${NODE_NAME:-$(hostname)}"
DRAIN_GRACE_PERIOD="${DRAIN_GRACE_PERIOD:-120}"
IMDS_URL="http://169.254.169.254/latest/meta-data/spot/instance-action"
REBALANCE_URL="http://169.254.169.254/latest/meta-data/events/recommendations/rebalance"
WEBHOOK_URL="${WEBHOOK_URL:-}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

notify() {
  local msg="$1"
  log "$msg"
  if [[ -n "$WEBHOOK_URL" ]]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"[spot-handler] $msg\"}" || true
  fi
}

check_imds() {
  # Returns HTTP status 200 if the notice is present, 404 otherwise
  curl -s -o /dev/null -w "%{http_code}" \
    --max-time 2 \
    -H "X-aws-ec2-metadata-token: $(get_imds_token)" \
    "$1"
}

get_imds_token() {
  curl -s -X PUT \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" \
    --max-time 2 \
    "http://169.254.169.254/latest/api/token"
}

cordon_node() {
  log "Cordoning node $NODE_NAME"
  kubectl cordon "$NODE_NAME"
}

drain_node() {
  log "Draining node $NODE_NAME (grace period: ${DRAIN_GRACE_PERIOD}s)"
  kubectl drain "$NODE_NAME" \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force \
    --grace-period="$DRAIN_GRACE_PERIOD" \
    --timeout="$((DRAIN_GRACE_PERIOD + 30))s" || {
    log "WARNING: drain did not complete cleanly — continuing"
  }
}

handle_interruption() {
  notify "SPOT INTERRUPTION detected on node $NODE_NAME — starting graceful eviction"
  cordon_node
  drain_node
  notify "Eviction complete on $NODE_NAME. Node is safe to terminate."
}

handle_rebalance() {
  notify "REBALANCE RECOMMENDATION received for node $NODE_NAME — cordoning for proactive replacement"
  cordon_node
}

log "Spot interruption handler started (node=$NODE_NAME, poll=${POLL_INTERVAL}s)"

while true; do
  interruption_status=$(check_imds "$IMDS_URL")
  if [[ "$interruption_status" == "200" ]]; then
    handle_interruption
    # After handling, wait for actual termination (max 2 min)
    sleep 120
    exit 0
  fi

  rebalance_status=$(check_imds "$REBALANCE_URL")
  if [[ "$rebalance_status" == "200" ]]; then
    handle_rebalance
  fi

  sleep "$POLL_INTERVAL"
done
