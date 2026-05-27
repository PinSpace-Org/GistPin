#!/usr/bin/env bash
set -euo pipefail

COVERAGE_FILE="Backend/coverage/coverage-summary.json"
THRESHOLDS_FILE="infrastructure/ci/coverage-thresholds.json"

if [[ ! -f "$COVERAGE_FILE" ]]; then
  echo "ERROR: Coverage report not found at $COVERAGE_FILE"
  exit 1
fi

node -e "
  const coverage = require('./$COVERAGE_FILE');
  const thresholds = require('./$THRESHOLDS_FILE');
  const global = thresholds.global;
  const total = coverage.total;
  let failed = false;

  for (const metric of ['lines', 'functions', 'branches', 'statements']) {
    const pct = total[metric].pct;
    const threshold = global[metric];
    if (pct < threshold) {
      console.error(\`FAIL: \${metric} coverage \${pct}% is below threshold \${threshold}%\`);
      failed = true;
    } else {
      console.log(\`OK: \${metric} coverage \${pct}% >= \${threshold}%\`);
    }
  }

  if (failed) process.exit(1);
  console.log('All coverage thresholds passed.');
"
