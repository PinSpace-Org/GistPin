# Terraform Change Notifications

When a Terraform plan touches resources owned by a team, that team is notified
automatically so infrastructure changes never land silently on someone else's
surface area.

## How it works

```
terraform plan -out=tfplan
./infrastructure/scripts/notify-resource-owners.sh tfplan
```

1. **Change detection** — the script reads the saved plan via
   `terraform show -json` and extracts every resource whose action is not a
   no-op (create / update / delete / replace).
2. **Ownership mapping** — each changed address is matched against the
   `resource_owners` map in `resource-ownership.tf` using a **longest-prefix**
   match, so `module.database.aws_db_instance.main` resolves to the
   `module.database` owner rather than the broader `aws_db_` prefix.
3. **Change summary** — changes are grouped per owning team and formatted into a
   readable summary listing each address and its action.
4. **Notification** — the summary is posted to the team's Slack channel and,
   unless the team has opted out, emailed to their distribution list.

## Ownership map

Ownership lives in `infrastructure/terraform/resource-ownership.tf`. Each entry
maps a Terraform address prefix to:

| Field           | Meaning                                             |
| --------------- | --------------------------------------------------- |
| `team`          | Owning team name (used for grouping and headings).  |
| `slack_channel` | Channel the change summary is posted to.            |
| `email`         | Distribution list for email notifications.          |
| `opt_out`       | When `true`, the team receives Slack only, no email.|

A `default_owner` catches any resource that matches no prefix, so a new resource
type is never dropped — it routes to the platform team until an explicit owner
is added.

The map is exposed as JSON through the `resource_ownership_map` output, which is
what the script consumes (no HCL parsing in Bash).

## Opt-out mechanism

A team that finds email too noisy can set `opt_out = true` in its ownership
entry; it will continue to receive Slack notifications but no email. To silence
a channel entirely, point `slack_channel` at a low-traffic archive channel or
remove the prefix and let it fall through to the default owner.

## Configuration

| Variable            | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook (required to send).      |
| `SMTP_FROM`         | From address for emails (default `terraform@gistpin.io`). |
| `DRY_RUN=true`      | Print notifications instead of sending them.    |

Run with `DRY_RUN=true` in CI to preview who *would* be notified for a given
plan without sending anything.

## Wiring into CI

Add a step after `terraform plan` in the pipeline that runs the script against
the saved plan. Because it only reads the plan and the ownership output, it has
no effect on `apply` and is safe to run on every PR that produces a plan.
