# GitOps Configuration Drift Management

## Overview

This document describes the drift detection system that monitors for configuration drift between Git-declared manifests and the live Kubernetes cluster state.

## Detection Strategy

The drift reporter (`infrastructure/scripts/drift-reporter.sh`) performs a weekly comparison:
1. Reads all Kubernetes manifests from `infrastructure/k8s/`
2. Applies each manifest with `--dry-run=server` to get the desired state
3. Compares against the live cluster state via `kubectl get`
4. Generates a JSON report with categorized drifts

## Severity Classification

| Severity | Resource Types | Action |
|----------|---------------|--------|
| Critical | StatefulSet, DaemonSet | Immediate alert, auto-remediation |
| High | Deployment | PR required, auto-issue created |
| Medium | ConfigMap, Secret, Service, Ingress | Weekly review |
| Low | HPA, PDB, others | Logged in report |

## Response Procedures

1. **Critical drift**: Pager alert triggered, on-call investigates
2. **High drift**: GitHub issue auto-created, assigned to infrastructure team
3. **Medium drift**: Reviewed in weekly infrastructure sync
4. **Low drift**: Noted in trend analysis

## Remediation

To remediate drift:
1. Update the Git manifests to match desired state
2. Or apply the live changes back to Git
3. Run `bash infrastructure/scripts/drift-reporter.sh` locally to verify
