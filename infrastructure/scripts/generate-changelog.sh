#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_PATH="${REPO_ROOT}/infrastructure/ci/changelog-config.json"
CHANGELOG_PATH="${REPO_ROOT}/CHANGELOG.md"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to generate changelog."
  exit 1
fi

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Config not found at ${CONFIG_PATH}"
  exit 1
fi

MAX_COMMITS="$(jq -r '.maxCommits // 300' "${CONFIG_PATH}")"
FALLBACK_SECTION="$(jq -r '.fallbackSection // "Other Changes"' "${CONFIG_PATH}")"
INCLUDE_COMPARE_LINK="$(jq -r '.includeCompareLink // true' "${CONFIG_PATH}")"
REPO_URL="$(jq -r '.repoUrl // ""' "${CONFIG_PATH}")"

TODAY="$(date +%Y-%m-%d)"
TMP_FILE="$(mktemp)"
SECTIONS_DIR="$(mktemp -d)"
TYPE_ORDER_FILE="$(mktemp)"

cleanup() {
  rm -rf "${SECTIONS_DIR}" "${TYPE_ORDER_FILE}"
}
trap cleanup EXIT

while IFS= read -r row; do
  type="$(jq -r '.type' <<<"${row}")"
  title="$(jq -r '.title' <<<"${row}")"
  printf '%s|%s\n' "${type}" "${title}" >> "${TYPE_ORDER_FILE}"
  : > "${SECTIONS_DIR}/${type}.md"
done < <(jq -c '.types[]' "${CONFIG_PATH}")
: > "${SECTIONS_DIR}/_fallback.md"

extract_issue_refs() {
  local text="$1"
  local refs
  refs="$(grep -Eo '#[0-9]+' <<<"${text}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | sed 's/[[:space:]]$//')"
  if [[ -n "${refs}" ]]; then
    printf ' (%s)' "${refs}"
  fi
}

extract_pr_ref() {
  local text="$1"
  local pr
  pr="$(grep -Eo '\(#[0-9]+\)$' <<<"${text}" | tail -n1 || true)"
  if [[ -n "${pr}" ]]; then
    printf ' %s' "${pr}"
  fi
}

normalize_summary() {
  local subject="$1"
  subject="$(sed -E 's/^[a-zA-Z]+(\([^)]+\))?!?:[[:space:]]*//' <<<"${subject}")"
  subject="$(sed -E 's/[[:space:]]+\(#[0-9]+\)$//' <<<"${subject}")"
  printf '%s' "${subject}"
}

while IFS= read -r line; do
  [[ -z "${line}" ]] && continue
  sha="${line%%|*}"
  subject="${line#*|}"

  commit_type="$(sed -nE 's/^([a-zA-Z]+)(\([^)]+\))?!?:.*/\1/p' <<<"${subject}" | tr '[:upper:]' '[:lower:]')"
  summary="$(normalize_summary "${subject}")"
  issue_refs="$(extract_issue_refs "${subject}")"
  pr_ref="$(extract_pr_ref "${subject}")"
  short_sha="$(git rev-parse --short "${sha}")"
  entry="- ${summary}${issue_refs}${pr_ref} ([${short_sha}](../../commit/${sha}))"

  if [[ -n "${commit_type:-}" && -f "${SECTIONS_DIR}/${commit_type}.md" ]]; then
    printf '%s\n' "${entry}" >> "${SECTIONS_DIR}/${commit_type}.md"
  else
    printf '%s\n' "${entry}" >> "${SECTIONS_DIR}/_fallback.md"
  fi
done < <(git log -n "${MAX_COMMITS}" --pretty=format:'%H|%s')

{
  echo "# Changelog"
  echo
  echo "## ${TODAY}"
  echo

  while IFS='|' read -r type title; do
    if [[ -s "${SECTIONS_DIR}/${type}.md" ]]; then
      echo "### ${title}"
      echo
      cat "${SECTIONS_DIR}/${type}.md"
      echo
    fi
  done < "${TYPE_ORDER_FILE}"

  if [[ -s "${SECTIONS_DIR}/_fallback.md" ]]; then
    echo "### ${FALLBACK_SECTION}"
    echo
    cat "${SECTIONS_DIR}/_fallback.md"
    echo
  fi

  if [[ "${INCLUDE_COMPARE_LINK}" == "true" && -n "${REPO_URL}" ]]; then
    latest_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
    if [[ -n "${latest_tag}" ]]; then
      head_sha="$(git rev-parse HEAD)"
      echo "[Full Changelog](${REPO_URL}/compare/${latest_tag}...${head_sha})"
    fi
  fi
} > "${TMP_FILE}"

mv "${TMP_FILE}" "${CHANGELOG_PATH}"
echo "Generated changelog at ${CHANGELOG_PATH}"
