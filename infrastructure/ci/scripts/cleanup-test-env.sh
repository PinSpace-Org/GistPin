#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning up integration test environment..."

docker rm -f gistpin-test-db 2>/dev/null && echo "Test database removed." || echo "Test database already removed."

echo "Cleanup complete."
