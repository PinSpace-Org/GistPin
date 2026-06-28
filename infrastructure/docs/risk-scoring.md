# Infrastructure Change Risk Scoring

## Overview

The risk scoring system evaluates infrastructure changes and assigns a risk score to each PR, helping teams identify high-impact changes that require additional review.

## Scoring Algorithm

Risk is calculated based on three factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Blast Radius** | 40% | How many resources are affected by the change |
| **Reversibility** | 35% | How easily the change can be rolled back |
| **Dependencies** | 15% | Number of dependent resources |
| **Backup Status** | 10% | Whether the resource has backup configured |

## Risk Classifications

| Score | Classification | Action Required |
|-------|---------------|-----------------|
| 0-25 | Low | Standard review |
| 26-50 | Medium | Additional reviewer |
| 51-75 | High | Team lead approval + extended review |
| 76-100 | Critical | Architecture review + change advisory board |

## Resource Risk Profiles

| Resource | Blast Radius | Reversibility | Default Risk |
|----------|-------------|---------------|-------------|
| S3 Bucket | Namespace | Full rollback | Low |
| RDS Instance | Service | Manual rollback | Medium |
| EKS Cluster | Cluster | Irreversible | Critical |
| IAM Role | Namespace | Full rollback | Low |
| Deployment | Multiple pods | Full rollback | Low |
| Namespace | Namespace | Manual rollback | Medium |
| ClusterRole | Cluster | Manual rollback | High |

## Override Mechanism

High-risk changes can be overridden by:
1. A security team lead approving the override
2. Providing a documented justification
3. Adding an infrastructure owner as reviewer
