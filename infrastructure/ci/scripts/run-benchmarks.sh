#!/usr/bin/env bash
set -euo pipefail

STAGING_URL="${STAGING_URL:-http://localhost:3000}"
RESULTS_DIR="benchmark-results"
mkdir -p "$RESULTS_DIR"

run_benchmark() {
  local name="$1"
  local path="$2"
  local method="${3:-GET}"
  local vus="${4:-10}"
  local duration="${5:-30s}"

  echo "Benchmarking $method $path..."
  k6 run --quiet \
    -e BASE_URL="$STAGING_URL" \
    -e ENDPOINT="$path" \
    -e METHOD="$method" \
    --vus "$vus" --duration "$duration" \
    --summary-export "$RESULTS_DIR/${name}.json" \
    - <<'EOF'
import http from 'k6/http';
import { sleep } from 'k6';
export default function () {
  http.request(__ENV.METHOD, `${__ENV.BASE_URL}${__ENV.ENDPOINT}`);
  sleep(0.1);
}
EOF
}

run_benchmark "get_gists"   "/gists"         GET  10 30s
run_benchmark "post_gists"  "/gists"         POST  5 30s
run_benchmark "get_nearby"  "/gists/nearby"  GET  10 30s
run_benchmark "get_health"  "/health"        GET  20 30s

# Merge results into summary.json
node -e "
  const fs = require('fs');
  const dir = '$RESULTS_DIR';
  const endpointMap = {
    get_gists:  'GET /gists',
    post_gists: 'POST /gists',
    get_nearby: 'GET /gists/nearby',
    get_health: 'GET /health',
  };
  const summary = {};
  for (const [file, endpoint] of Object.entries(endpointMap)) {
    const data = JSON.parse(fs.readFileSync(\`\${dir}/\${file}.json\`, 'utf8'));
    const http_req_duration = data.metrics?.http_req_duration;
    if (http_req_duration) {
      summary[endpoint] = {
        p50: Math.round(http_req_duration['p(50)']),
        p95: Math.round(http_req_duration['p(95)']),
        p99: Math.round(http_req_duration['p(99)']),
        rps: Math.round(data.metrics?.http_reqs?.rate ?? 0),
      };
    }
  }
  fs.writeFileSync(\`\${dir}/summary.json\`, JSON.stringify(summary, null, 2));
  console.log('Benchmark summary written to $RESULTS_DIR/summary.json');
"
