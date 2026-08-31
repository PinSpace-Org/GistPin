#!/usr/bin/env bash
# notify-resource-owners.sh - Notify owning teams when a Terraform plan changes
#                             resources they own.
#
# Given a saved Terraform plan, this script:
#   1. Extracts the changed resource addresses (create/update/delete/replace).
#   2. Maps each to an owning team using the resource_ownership_map output.
#   3. Groups changes per owner and formats a change summary.
#   4. Sends the summary to each owner's Slack channel and/or email, honouring
#      each owner's opt-out preference.
#
# Usage:
#   terraform plan -out=tfplan
#   ./notify-resource-owners.sh tfplan
#
# Environment:
#   SLACK_WEBHOOK_URL   Slack incoming webhook (required unless --dry-run)
#   SMTP_FROM           From address for email notifications
#   DRY_RUN=true        Print notifications instead of sending them
set -euo pipefail

PLAN_FILE="${1:-tfplan}"
DRY_RUN="${DRY_RUN:-false}"

command -v terraform >/dev/null || { echo "terraform not found" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Plan file not found: $PLAN_FILE" >&2
  exit 1
fi

# Ownership map comes from the resource-ownership.tf output.
OWNERSHIP_JSON="$(terraform output -raw resource_ownership_map 2>/dev/null || echo '{}')"
if [[ "$OWNERSHIP_JSON" == "{}" ]]; then
  echo "Warning: resource_ownership_map output is empty; using default owner only" >&2
fi

PLAN_JSON="$(terraform show -json "$PLAN_FILE")"

# Collect changed resource addresses along with the action taken.
# actions can be ["create"], ["update"], ["delete"], or ["delete","create"] (replace).
mapfile -t CHANGES < <(echo "$PLAN_JSON" | jq -r '
  .resource_changes[]
  | select(.change.actions != ["no-op"] and .change.actions != ["read"])
  | "\(.address)\t\(.change.actions | join("+"))"
')

if [[ ${#CHANGES[@]} -eq 0 ]]; then
  echo "No resource changes in plan; nothing to notify."
  exit 0
fi

# Resolve the owning team for a resource address by longest-prefix match.
resolve_owner() {
  local address="$1"
  echo "$OWNERSHIP_JSON" | jq -r --arg addr "$address" '
    .owners as $owners
    | ($owners | to_entries
        | map(select($addr | startswith(.key)))
        # Prefer the most specific (longest) matching prefix.
        | sort_by(.key | length) | reverse | .[0]) as $match
    | if $match == null then .default else $match.value end
    | "\(.team)\t\(.slack_channel)\t\(.email)\t\(.opt_out)"
  '
}

# Group changes per team into a temp associative array.
declare -A TEAM_CHANGES
declare -A TEAM_SLACK
declare -A TEAM_EMAIL
declare -A TEAM_OPTOUT

for line in "${CHANGES[@]}"; do
  address="${line%%$'\t'*}"
  action="${line##*$'\t'}"
  IFS=$'\t' read -r team slack email optout < <(resolve_owner "$address")
  TEAM_CHANGES["$team"]+="  - ${address} (${action})"$'\n'
  TEAM_SLACK["$team"]="$slack"
  TEAM_EMAIL["$team"]="$email"
  TEAM_OPTOUT["$team"]="$optout"
done

send_slack() {
  local channel="$1" text="$2"
  if [[ "$DRY_RUN" == "true" || -z "${SLACK_WEBHOOK_URL:-}" ]]; then
    echo "[dry-run] Slack -> ${channel}:"; echo "$text"
    return 0
  fi
  jq -n --arg ch "$channel" --arg txt "$text" '{channel: $ch, text: $txt}' \
    | curl -sS -X POST -H 'Content-Type: application/json' -d @- "$SLACK_WEBHOOK_URL" >/dev/null
}

send_email() {
  local to="$1" subject="$2" body="$3"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] Email -> ${to} (${subject})"; echo "$body"
    return 0
  fi
  # mailx/sendmail wrapper; environments without a mail agent should rely on Slack.
  if command -v mailx >/dev/null; then
    printf '%s\n' "$body" | mailx -r "${SMTP_FROM:-terraform@gistpin.io}" -s "$subject" "$to"
  else
    echo "Warning: no mail agent available; skipping email to $to" >&2
  fi
}

for team in "${!TEAM_CHANGES[@]}"; do
  summary="Terraform changes affecting *${team}*:"$'\n'"${TEAM_CHANGES[$team]}"
  echo "=== ${team} ==="
  send_slack "${TEAM_SLACK[$team]}" "$summary"
  if [[ "${TEAM_OPTOUT[$team]}" == "true" ]]; then
    echo "  (email opted out for ${team})"
  else
    send_email "${TEAM_EMAIL[$team]}" "Terraform changes affecting ${team}" "$summary"
  fi
done

echo "Notified ${#TEAM_CHANGES[@]} team(s)."
