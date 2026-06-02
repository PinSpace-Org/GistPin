#!/usr/bin/env bash
# Run load tests using k6 or Locust
set -euo pipefail

TOOL="${1:-k6}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCRIPT_DIR="$(dirname "$0")/load-tests"

echo "==> Running load tests with $TOOL against $BASE_URL"

case "$TOOL" in
  k6)
    if ! command -v k6 &>/dev/null; then
      echo "Installing k6..."
      curl -sSL https://github.com/grafana/k6/releases/download/v0.50.0/k6-v0.50.0-linux-amd64.tar.gz \
        | tar -xz --strip-components=1 -C /usr/local/bin k6-v0.50.0-linux-amd64/k6
    fi
    BASE_URL="$BASE_URL" k6 run "$SCRIPT_DIR/api-load-test.js"
    ;;
  locust)
    if ! command -v locust &>/dev/null; then
      pip install locust --quiet
    fi
    locust -f "$SCRIPT_DIR/locustfile.py" \
      --host="$BASE_URL" \
      --headless \
      --users 50 \
      --spawn-rate 5 \
      --run-time 2m \
      --html /tmp/locust-report.html
    echo "Report: /tmp/locust-report.html"
    ;;
  *)
    echo "Unknown tool: $TOOL. Use 'k6' or 'locust'."
    exit 1
    ;;
esac

echo "==> Load test complete."
