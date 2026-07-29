# WAFv2 Rules

## Managed Rule Groups

| Rule Group | Priority | Purpose |
|---|---|---|
| AWSManagedRulesCommonRuleSet | 1 | Core OWASP protection |
| AWSManagedRulesKnownBadInputsRuleSet | 2 | Known attack patterns |
| AWSManagedRulesAmazonIpReputationList | 3 | IP reputation filtering |
| AWSManagedRulesBotControlRuleSet | 4 | Bot traffic management |

## Custom Rules
- Soroban RPC rate limiting: 100 requests/IP

## Monitoring
All rules emit CloudWatch metrics for real-time monitoring.
