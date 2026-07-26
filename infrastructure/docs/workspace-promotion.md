# Terraform Workspace Promotion Workflow

## Overview
Promotes infrastructure configuration changes through environments (`dev` -> `staging` -> `prod`).

## Usage
- **Diff Workspaces**: `./infrastructure/scripts/promote-workspace.sh dev staging diff`
- **Execute Promotion**: `./infrastructure/scripts/promote-workspace.sh dev staging promote`
- **Rollback Workspace**: `./infrastructure/scripts/promote-workspace.sh dev staging rollback`

## Approval Gates & History
- CI/CD workflow uses approval gates before production application.
- All promotion events are appended to `promotion-history.log`.
