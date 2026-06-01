#!/usr/bin/env bash
# Generate infrastructure documentation (Terraform docs, K8s resource docs)
set -euo pipefail

OUTPUT_DIR="infrastructure/docs/auto-generated"
mkdir -p "$OUTPUT_DIR"

echo "==> Generating Terraform docs..."
if command -v terraform-docs &>/dev/null; then
  terraform-docs markdown table infrastructure/terraform/ > "$OUTPUT_DIR/terraform.md"
  echo "    Written: $OUTPUT_DIR/terraform.md"
else
  echo "    [SKIP] terraform-docs not installed"
fi

echo "==> Generating K8s resource docs..."
if command -v kubectl &>/dev/null; then
  kubectl api-resources --verbs=list --namespaced -o name 2>/dev/null | head -20 > "$OUTPUT_DIR/k8s-resources.txt" || true
fi
# Document manifests from the repo
{
  echo "# Kubernetes Resources"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  for f in infrastructure/k8s/*.yaml; do
    kind=$(grep -m1 '^kind:' "$f" 2>/dev/null | awk '{print $2}' || true)
    name=$(grep -m1 '^  name:' "$f" 2>/dev/null | awk '{print $2}' || true)
    [ -n "$kind" ] && echo "- **$kind**: \`$name\`  (\`$(basename "$f")\`)"
  done
} > "$OUTPUT_DIR/k8s-resources.md"
echo "    Written: $OUTPUT_DIR/k8s-resources.md"

echo "==> Generating dependency graph..."
{
  echo "# Dependency Graph"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Backend"
  if [ -f Backend/package.json ]; then
    node -e "const p=require('./Backend/package.json'); Object.keys(p.dependencies||{}).forEach(d=>console.log('- '+d))" 2>/dev/null || cat Backend/package.json | grep -A100 '"dependencies"' | grep '"' | head -30
  fi
  echo ""
  echo "## Frontend"
  if [ -f Frontend/package.json ]; then
    node -e "const p=require('./Frontend/package.json'); Object.keys(p.dependencies||{}).forEach(d=>console.log('- '+d))" 2>/dev/null || true
  fi
} > "$OUTPUT_DIR/dependency-graph.md"
echo "    Written: $OUTPUT_DIR/dependency-graph.md"

echo "==> Writing index..."
{
  echo "# Auto-Generated Infrastructure Docs"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "| Document | Description |"
  echo "|----------|-------------|"
  echo "| [terraform.md](terraform.md) | Terraform module documentation |"
  echo "| [k8s-resources.md](k8s-resources.md) | Kubernetes resource inventory |"
  echo "| [dependency-graph.md](dependency-graph.md) | Project dependency graph |"
} > "$OUTPUT_DIR/README.md"

echo "Done. Docs written to $OUTPUT_DIR/"
