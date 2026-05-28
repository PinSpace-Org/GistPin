#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RULES_PATH="${REPO_ROOT}/infrastructure/ci/version-rules.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

cd "${REPO_ROOT}"

latest_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [[ -n "${latest_tag}" ]]; then
  range="${latest_tag}..HEAD"
else
  range="$(git rev-list --max-parents=0 HEAD)..HEAD"
fi

log_data="$(git log --pretty=format:'%s%n%b<<END>>' ${range})"

bump="none"
if grep -Eq "BREAKING CHANGE|!:" <<<"${log_data}"; then
  bump="major"
elif grep -Eiq '^feat(\(.+\))?:' <<<"${log_data}"; then
  bump="minor"
elif grep -Eiq '^(fix|perf|refactor|build|ci|chore)(\(.+\))?:' <<<"${log_data}"; then
  bump="patch"
else
  bump="$(jq -r '.defaultBump // "patch"' "${RULES_PATH}")"
fi

version_files="$(find . -name package.json -not -path "*/node_modules/*" -print)"
if [[ -z "${version_files}" ]]; then
  echo "No package.json files found."
  exit 1
fi

first_file="$(awk 'NR==1{print $0}' <<<"${version_files}")"
current_version="$(jq -r '.version // "0.1.0"' "${first_file}")"

IFS='.' read -r major minor patch <<<"${current_version}"
major="${major:-0}"
minor="${minor:-1}"
patch="${patch:-0}"

case "${bump}" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "No bump computed"; exit 1 ;;
esac

new_version="${major}.${minor}.${patch}"
tag_prefix="$(jq -r '.tagPrefix // "v"' "${RULES_PATH}")"
new_tag="${tag_prefix}${new_version}"

while IFS= read -r pkg; do
  tmp="$(mktemp)"
  jq --arg v "${new_version}" '.version = $v' "${pkg}" > "${tmp}"
  mv "${tmp}" "${pkg}"
done <<<"${version_files}"

echo "Bump type: ${bump}"
echo "New version: ${new_version}"
echo "New tag: ${new_tag}"
echo "${new_tag}" > .next-version-tag
