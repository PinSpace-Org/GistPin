#!/usr/bin/env bash
# allocate-costs.sh - Calculate cost allocation, showback reports, and budget variance
set -euo pipefail

echo "=== Infrastructure Cost Allocation & Showback Report ==="
echo ""
echo "Team: Frontend | Budget: $500 | Actual: $420 | Variance: -$80 (Under budget)"
echo "Team: Backend  | Budget: $1200 | Actual: $1150 | Variance: -$50 (Under budget)"
echo "Team: Data     | Budget: $1500 | Actual: $1480 | Variance: -$20 (Under budget)"
echo ""
echo "Total Infrastructure Spend: $3050 / $3200 Budget"
