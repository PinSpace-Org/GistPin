# CloudFormation Drift Detection

## Overview

Automated drift detection for CloudFormation stacks ensures infrastructure state matches the desired configuration. This runs on a 6-hour schedule and creates GitHub issues when drift is detected.

## How It Works

1. Lists all CloudFormation stacks matching the pattern `gistpin-*`
2. Initiates drift detection for each stack via `aws cloudformation detect-stack-drift`
3. Waits for detection to complete (up to 120 seconds per stack)
4. Identifies resources with `MODIFIED` or `DELETED` status
5. Generates a JSON report and optionally creates a GitHub issue

## Stack Discovery

The detection script discovers stacks by:
- Filtering by `CREATE_COMPLETE`, `UPDATE_COMPLETE`, and `UPDATE_ROLLBACK_COMPLETE` statuses
- Matching the configurable pattern (default: `gistpin-*`)

## Drift Report Format

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "region": "us-east-1",
  "pattern": "gistpin-*",
  "stacks": [
    {
      "stack": "gistpin-production-vpc",
      "drifted_resources": [
        {
          "Resource": "InternetGateway",
          "Status": "MODIFIED",
          "Type": "AWS::EC2::InternetGateway"
        }
      ]
    }
  ]
}
```

## Execution

```bash
# Manual drift check
./infrastructure/scripts/cfn-drift-check.sh

# Custom pattern
./infrastructure/scripts/cfn-drift-check.sh --pattern "gistpin-prod-*"

# With Slack notification
SLACK_WEBHOOK=https://hooks.slack.com/... ./infrastructure/scripts/cfn-drift-check.sh
```

## CI Schedule

- Runs every 6 hours via GitHub Actions
- Manual trigger available via `workflow_dispatch`
- Reports uploaded as artifacts with 30-day retention
- Auto-creates GitHub issues on drift detection

## Remediation

When drift is detected:
1. Review the drift report to identify affected resources
2. Determine if the drift is intentional or accidental
3. If intentional: update the CloudFormation template to match
4. If accidental: apply corrective changes to restore desired state
5. Verify drift is resolved on next detection cycle
