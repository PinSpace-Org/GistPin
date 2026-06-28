# Infrastructure Dependency Update Policy

## Overview

This document defines the policy for managing infrastructure tool version updates across the GistPin platform.

## Update Schedule

| Dependency | Check Frequency | Update Window | Review Period |
|------------|----------------|---------------|---------------|
| Terraform | Weekly (Mon) | Within 2 weeks | 3 days |
| Helm Charts | Weekly (Mon) | Within 1 month | 5 days |
| Base Images | Weekly (Mon) | Within 1 week | 2 days |
| Node.js | Monthly | Within 2 weeks | 5 days |
| Python | Monthly | Within 2 weeks | 5 days |

## Update Process

1. **Detection**: The dependency update bot runs weekly and generates a report
2. **PR Creation**: Updates are proposed as automated PRs
3. **Verification**: Each update PR runs the full CI pipeline
4. **Review**: Infrastructure team reviews and merges within the review period
5. **Deployment**: Updates are deployed to staging first, then production

## Version Constraints

| Tool | Min Version | Max Version | Strategy |
|------|-------------|-------------|----------|
| Terraform | 1.5.0 | Latest | Minor updates auto-merge |
| Helm | 3.12.0 | Latest | Minor updates auto-merge |
| Node.js | 18 LTS | Current | LTS to LTS only |
| PostgreSQL | 14 | Latest-1 | Never latest major |

## Rollback Procedure

If an update causes issues:
1. Revert the dependency update PR
2. Pin the version in `infrastructure/ci/*.yml`
3. Investigate compatibility
4. File an issue tracking the incompatibility
