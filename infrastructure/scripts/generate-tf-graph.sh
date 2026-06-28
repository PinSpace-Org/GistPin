#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

TERRAFORM_DIR="${TERRAFORM_DIR:-infrastructure/terraform}"
OUTPUT_DIR="${OUTPUT_DIR:-infrastructure/docs}"
PR_COMMENT="${PR_COMMENT:-false}"
EXIT_CODE=0

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

check_prerequisites() {
  if ! command -v terraform >/dev/null 2>&1; then
    log "ERROR: terraform not installed."
    exit 1
  fi
  if ! command -v dot >/dev/null 2>&1; then
    log "ERROR: graphviz (dot) not installed."
    exit 1
  fi
  mkdir -p "${OUTPUT_DIR}"
}

generate_graph_dot() {
  log "Generating Terraform graph (DOT)..."
  local graph_dot="${OUTPUT_DIR}/resource-graph.dot"
  terraform -chdir="${TERRAFORM_DIR}" graph -plan=tfplan 2>/dev/null | tee "${graph_dot}" || terraform -chdir="${TERRAFORM_DIR}" graph 2>/dev/null > "${graph_dot}"
  if [[ ! -s "${graph_dot}" ]]; then
    log "ERROR: Failed to generate graph DOT output."
    return 1
  fi
  log "DOT file generated: ${graph_dot}"
}

convert_to_svg() {
  log "Converting DOT to SVG..."
  local graph_dot="${OUTPUT_DIR}/resource-graph.dot"
  local graph_svg="${OUTPUT_DIR}/resource-graph.svg"

  if command -v dot >/dev/null 2>&1; then
    dot -Tsvg "${graph_dot}" -o "${graph_svg}" 2>&1
    log "SVG generated: ${graph_svg}"
  else
    log "WARNING: graphviz not available, skipping SVG conversion."
    return 1
  fi
}

generate_html_view() {
  log "Generating interactive HTML view..."
  local graph_dot="${OUTPUT_DIR}/resource-graph.dot"
  local html_file="${OUTPUT_DIR}/resource-graph.html"

  cat > "${html_file}" << HTML
<!DOCTYPE html>
<html>
<head>
  <title>Terraform Resource Graph - GistPin</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    h1 { color: #0f172a; }
    svg { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Terraform Resource Graph</h1>
  <p>Generated: $(date -u)</p>
  <div>
    <img src="resource-graph.svg" alt="Terraform Resource Graph" />
  </div>
</body>
</html>
HTML
  log "HTML view generated: ${html_file}"
}

highlight_changes() {
  if [[ -n "${CHANGED_RESOURCES:-}" ]]; then
    log "Highlighting changed resources..."
    local graph_dot="${OUTPUT_DIR}/resource-graph.dot"
    local highlighted_dot="${OUTPUT_DIR}/resource-graph-changes.dot"

    sed 's/\(.*\)/\1 [style="filled" fillcolor="#ffffcc"]/' "${graph_dot}" \
      | sed '/^$/d' > "${highlighted_dot}.tmp"

    IFS=',' read -ra changes <<< "${CHANGED_RESOURCES}"
    for change in "${changes[@]}"; do
      sed -i '' "s/\"${change}\"/\"${change}\" [style=\"filled\" fillcolor=\"#ffcccc\"]/g" "${highlighted_dot}.tmp" 2>/dev/null || \
      sed -i "s/\"${change}\"/\"${change}\" [style=\"filled\" fillcolor=\"#ffcccc\"]/g" "${highlighted_dot}.tmp"
    done

    mv "${highlighted_dot}.tmp" "${highlighted_dot}"
    dot -Tsvg "${highlighted_dot}" -o "${OUTPUT_DIR}/resource-graph-changes.svg"
    log "Change-highlighted SVG generated."
  fi
}

main() {
  check_prerequisites

  if ! generate_graph_dot; then
    log "No terraform plan found. Running terraform plan first..."
    terraform -chdir="${TERRAFORM_DIR}" plan -out=tfplan 2>/dev/null || true
    generate_graph_dot || {
      log "ERROR: Could not generate graph."
      exit 1
    }
  fi

  convert_to_svg
  generate_html_view
  highlight_changes

  log "Terraform graph visualization generated in ${OUTPUT_DIR}/"
}

main "$@"
