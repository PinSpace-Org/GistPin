#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="infrastructure/ci/docs-config.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

spec_output="$(jq -r '.specOutput' "${CONFIG_PATH}")"
site_output="$(jq -r '.siteOutput' "${CONFIG_PATH}")"
version_file="$(jq -r '.versionFile' "${CONFIG_PATH}")"

mkdir -p "$(dirname "${spec_output}")" "${site_output}" "$(dirname "${version_file}")"

version="${1:-$(date +%Y.%m.%d)}"
echo "${version}" > "${version_file}"

cat > "${spec_output}" <<EOF
{
  "openapi": "3.0.0",
  "info": {
    "title": "GistPin API",
    "version": "${version}"
  },
  "paths": {}
}
EOF

cat > "${site_output}/index.html" <<EOF
<!doctype html>
<html>
  <head><meta charset="utf-8"><title>GistPin API Docs</title></head>
  <body>
    <h1>GistPin API Documentation</h1>
    <p>Version: ${version}</p>
    <pre id="spec"></pre>
    <script>
      fetch("../openapi.json").then(r => r.json()).then(d => {
        document.getElementById("spec").textContent = JSON.stringify(d, null, 2);
      });
    </script>
  </body>
</html>
EOF

echo "Generated API docs for version ${version}"
