#!/usr/bin/env bash
#
# Fetch the Cilium CLI binary on demand (instead of committing the ~71MB
# tarball into the repo). Run this in CI or locally before using `cilium`.
#
# Usage:
#   ./scripts/fetch-cilium.sh [version]
# Example:
#   ./scripts/fetch-cilium.sh v0.16.16
#
set -euo pipefail

CILIUM_CLI_VERSION="${1:-${CILIUM_CLI_VERSION:-v0.16.16}}"
ARCH="amd64"
OS="linux"
TARBALL="cilium-${OS}-${ARCH}.tar.gz"
BASE_URL="https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}"

echo "Downloading Cilium CLI ${CILIUM_CLI_VERSION} (${OS}/${ARCH})..."
curl -fsSL --remote-name-all \
  "${BASE_URL}/${TARBALL}" \
  "${BASE_URL}/${TARBALL}.sha256sum"

echo "Verifying checksum..."
sha256sum --check "${TARBALL}.sha256sum"

echo "Extracting cilium binary..."
tar xzvf "${TARBALL}"
rm -f "${TARBALL}" "${TARBALL}.sha256sum"

echo "Done. 'cilium' binary is in the current directory."
echo "Move it onto your PATH if desired, e.g.: sudo mv cilium /usr/local/bin/"
