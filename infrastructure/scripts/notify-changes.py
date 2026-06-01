#!/usr/bin/env python3
"""
Terraform Drift Notification Script
Sends alerts for manual review changes via webhook or GitHub issue.
"""
import json
import argparse
import sys
import os
import subprocess
from datetime import datetime, timezone


def post_to_webhook(webhook_url, message):
    try:
        import urllib.request
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(message).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as exc:
        print(f"Failed to post to webhook: {exc}", file=sys.stderr)
        return False


def format_slack_message(changes, repo, timestamp):
    fields = []
    for c in changes[:10]:
        fields.append({
            "title": c.get("address"),
            "value": f"Change: {c.get('change')}\nReason: {c.get('reason')}",
            "short": False,
        })
    if len(changes) > 10:
        fields.append({
            "title": "...",
            "value": f"{len(changes) - 10} more changes not shown",
            "short": False,
        })

    return {
        "text": "Terraform Drift Alert - Manual Review Required",
        "attachments": [{
            "color": "warning",
            "title": f"Drift detected in {repo}",
            "ts": datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp(),
            "fields": fields,
        }],
    }


def format_github_issue_body(changes, repo, timestamp):
    lines = ["## Terraform Drift Alert\n\n"]
    lines.append("### Summary\n\n")
    lines.append(f"- **Repository:** {repo}\n")
    lines.append(f"- **Timestamp:** {timestamp}\n")
    lines.append(f"- **Manual Review Required:** {len(changes)} change(s)\n\n")
    lines.append("### Changes Requiring Manual Review\n\n")
    lines.append("| Resource | Change | Reason |\n")
    lines.append("|----------|--------|--------|\n")
    for c in changes:
        lines.append(
            f"| `{c.get('address')}` | {c.get('change')} | {c.get('reason', '')} |\n"
        )
    lines.append("\n### Recommended Action\n\n")
    lines.append("1. Review each change above\n")
    lines.append("2. Update Terraform config if change is expected\n")
    lines.append("3. Or revert the external change if drift was accidental\n")
    return "".join(lines)


def create_github_issue(repo, title, body, labels=None):
    try:
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if not token:
            print("GITHUB_TOKEN not set. Skipping GitHub issue creation.", file=sys.stderr)
            return False

        import urllib.request
        api_url = f"https://api.github.com/repos/{repo}/issues"
        payload = {"title": title, "body": body}
        if labels:
            payload["labels"] = labels

        req = urllib.request.Request(
            api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = json.loads(resp.read().decode("utf-8"))
            print(f"Created GitHub issue: {resp_body.get('html_url')}")
            return True
    except Exception as exc:
        print(f"Failed to create GitHub issue: {exc}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Notify on manual drift changes")
    parser.add_argument("--manual-changes", required=True, help="Path to manual-changes.json")
    parser.add_argument("--webhook", default="", help="Webhook URL for notifications")
    parser.add_argument("--github-repo", default="", help="GitHub repo (owner/name)")
    parser.add_argument("--timestamp", default=datetime.now(timezone.utc).isoformat())
    parser.add_argument("--labels", default="infrastructure,terraform,drift")
    args = parser.parse_args()

    with open(args.manual_changes) as f:
        changes = json.load(f)

    if not changes:
        print("No manual changes to notify about.")
        return 0

    title = f"Terraform drift - manual review required ({len(changes)} change(s))"
    body = format_github_issue_body(changes, args.github_repo or "unknown", args.timestamp)

    if args.webhook:
        post_to_webhook(args.webhook, format_slack_message(changes, args.github_repo, args.timestamp))

    if args.github_repo:
        create_github_issue(args.github_repo, title, body, args.labels.split(","))

    return 0


if __name__ == "__main__":
    sys.exit(main())
