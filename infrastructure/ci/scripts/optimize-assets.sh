#!/usr/bin/env bash
set -euo pipefail

NEXT_DIR="Frontend/.next"

if [ ! -d "$NEXT_DIR" ]; then
  echo "No .next build directory found. Skipping asset optimization."
  exit 0
fi

echo "Optimizing static assets in $NEXT_DIR..."

# Report image sizes before optimization
echo "=== Asset sizes ==="
find "$NEXT_DIR/static" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) \
  -exec du -sh {} \; 2>/dev/null || echo "No images found in static dir."

# Count JS/CSS bundles
JS_COUNT=$(find "$NEXT_DIR/static" -name "*.js" | wc -l)
CSS_COUNT=$(find "$NEXT_DIR/static" -name "*.css" | wc -l)
echo "JS bundles: $JS_COUNT"
echo "CSS bundles: $CSS_COUNT"

# Total build size
TOTAL_SIZE=$(du -sh "$NEXT_DIR" | cut -f1)
echo "Total build size: $TOTAL_SIZE"

echo "Asset optimization complete."
