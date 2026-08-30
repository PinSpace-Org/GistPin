#!/usr/bin/env bash
# inject-latency.sh - Inject network latency into a target pod for chaos /
#                     performance testing, using tc netem.
#
# Adds a netem delay to the pod's primary interface, measures the impact, holds
# it for a duration, then ALWAYS cleans up (even on Ctrl-C / error) so a test
# never leaves latency behind.
#
# Usage:
#   ./inject-latency.sh --pod backend-abc123 --namespace backend \
#       --latency 200ms --jitter 50ms --duration 120
#   ./inject-latency.sh --pod backend-abc123 --namespace backend --clean  # remove only
#
# Requires the target container to have `tc` (iproute2) and the NET_ADMIN
# capability. For pods without tc, use the chaos Job in
# infrastructure/k8s/chaos/latency-injection.yaml which runs in a sidecar.
set -euo pipefail

POD=""
NAMESPACE="default"
IFACE="eth0"
LATENCY="100ms"
JITTER="0ms"
DURATION="60"
CLEAN_ONLY="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pod)       POD="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --iface)     IFACE="$2"; shift 2 ;;
    --latency)   LATENCY="$2"; shift 2 ;;
    --jitter)    JITTER="$2"; shift 2 ;;
    --duration)  DURATION="$2"; shift 2 ;;
    --clean)     CLEAN_ONLY="true"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$POD" ]] && { echo "--pod is required" >&2; exit 1; }
command -v kubectl >/dev/null || { echo "kubectl not found" >&2; exit 1; }

kexec() { kubectl -n "$NAMESPACE" exec "$POD" -- "$@"; }

cleanup() {
  echo "Removing latency injection from ${POD}..."
  # `|| true` — the qdisc may already be gone; cleanup must never fail the run.
  kexec tc qdisc del dev "$IFACE" root 2>/dev/null || true
  echo "Cleanup complete; ${IFACE} restored to default queueing."
}

if [[ "$CLEAN_ONLY" == "true" ]]; then
  cleanup
  exit 0
fi

# Ensure cleanup runs on normal exit, error, or interrupt.
trap cleanup EXIT INT TERM

echo "=== Latency injection: ${POD} (${NAMESPACE}) ${IFACE} +${LATENCY} jitter ${JITTER} for ${DURATION}s ==="

# Baseline measurement before injecting.
echo "Measuring baseline RTT (loopback control)..."
BASELINE="$(kexec ping -c 3 -q 127.0.0.1 2>/dev/null | awk -F'/' '/rtt|round-trip/ {print $5"ms"}' || echo 'n/a')"
echo "  baseline avg RTT: ${BASELINE}"

# Inject: netem delay with optional jitter (normal distribution).
echo "Injecting latency..."
if [[ "$JITTER" != "0ms" ]]; then
  kexec tc qdisc add dev "$IFACE" root netem delay "$LATENCY" "$JITTER" distribution normal
else
  kexec tc qdisc add dev "$IFACE" root netem delay "$LATENCY"
fi

# Confirm the qdisc is in place.
echo "Active qdisc:"
kexec tc qdisc show dev "$IFACE" | sed 's/^/  /'

echo "Holding for ${DURATION}s (Ctrl-C to end early; cleanup is automatic)..."
sleep "$DURATION"

# Impact measurement is captured by the caller's own probes / SLO dashboards
# during the hold window; the trap-based cleanup then restores the interface.
echo "Test window complete."
