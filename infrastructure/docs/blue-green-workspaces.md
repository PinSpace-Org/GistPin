# Terraform Blue-Green Workspace Strategy

## Overview

GistPin uses **parallel Terraform workspaces** (`blue` and `green`) to apply
infrastructure changes with **zero downtime**. The active traffic slot is toggled
between the two by selecting the corresponding workspace and re-applying, so the
inactive slot can be staged, validated, and promoted independently.

This strategy is driven by two tfvar files:

- `infrastructure/terraform/workspace-blue.tfvars`
- `infrastructure/terraform/workspace-green.tfvars`

Each defines the `active_workspace`, `stage_suffix`, `app_version`,
`traffic_weight`, and `listener_forward` variables consumed by
`infrastructure/terraform/blue-green.tf` to wire the ALB listener / target-group
switch.

## Usage

The automation is `infrastructure/scripts/blue-green-workspace.sh`.

```bash
# Show which workspace is currently active
./infrastructure/scripts/blue-green-workspace.sh status

# Stage and apply the inactive slot with its tfvars
./infrastructure/scripts/blue-green-workspace.sh apply

# Explicitly apply a specific slot
./infrastructure/scripts/blue-green-workspace.sh apply green

# Validate state, then switch traffic to the inactive slot
./infrastructure/scripts/blue-green-workspace.sh switch

# Roll back traffic to the previously-active slot
./infrastructure/scripts/blue-green-workspace.sh rollback

# Destroy and delete a workspace after promotion (e.g. the old blue)
./infrastructure/scripts/blue-green-workspace.sh cleanup blue

# Dry run any of the above
./infrastructure/scripts/blue-green-workspace.sh switch --dry-run
```

## Workspace Variables

| Variable | blue | green | Purpose |
|----------|------|-------|---------|
| `active_workspace` | `blue` | `green` | Marker of the active slot |
| `stage_suffix` | `blue` | `green` | Suffix used in resource names |
| `app_version` | `1.4.2` | `1.5.0` | Version deployed to the slot |
| `traffic_weight` | `0` | `100` | Share of traffic routed to the slot |
| `listener_forward` | `blue` | `green` | ALB listener target for the slot |

The `listener_forward` value selects which `aws_lb_listener_rule` is active,
so switching `green` == `100`% traffic to the green target group in one apply.

## Traffic Shift Hook

`switch` performs the promotion:

1. **State validation** — runs `terraform plan -detailed-exitcode` and checks
   `terraform state list` is non-empty before allowing the switch.
2. **Select workspace** — selects the target workspace.
3. **Apply** — re-applies with the target `*.tfvars`, re-pointing the ALB
   listener to the active slot.
4. **Mark active** — tags the ALB with the promoted slot so future runs know
   which workspace is live.

## Rollback

If the promoted slot misbehaves, return to the previously-active slot instantly:

```bash
./infrastructure/scripts/blue-green-workspace.sh rollback
```

Rollback re-validates the previous workspace's state before re-applying it, so
it is safe even if the failed promotion left the cluster partially updated.

## Cleanup

After a slot has been promoted and given a soak period, remove the retired slot
to reclaim resources:

```bash
./infrastructure/scripts/blue-green-workspace.sh cleanup blue
```

The script refuses to clean up the currently-active workspace, and it destroys
resources (`terraform destroy`) before deleting the workspace from the backend,
so there is no dangling state.

## CI Integration

A scheduled or PR-triggered workflow can invoke the script (matching the
`infrastructure/ci/*.yml` conventions):

```yaml
- name: Blue-green switch
  run: bash infrastructure/scripts/blue-green-workspace.sh switch
```

See `docs/workspace-promotion.md` for the related dev -> staging -> prod
workspace promotion flow.
