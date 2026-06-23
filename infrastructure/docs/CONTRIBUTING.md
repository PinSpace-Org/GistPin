# Infrastructure Contributing Guide

Welcome to the GistPin infrastructure team. This guide covers everything you need to contribute effectively.

## Prerequisites

Install all required tools listed in [TOOLS.md](./TOOLS.md) before proceeding.

## Folder Structure

```
infrastructure/
├── ci/            # GitHub Actions workflows and CI scripts
├── docs/          # Documentation (you are here)
├── docker/        # Dockerfiles and compose configs
├── k8s/           # Kubernetes manifests and Helm values
├── monitoring/    # Prometheus, Grafana, alerting configs
├── scripts/       # Operational shell/Python scripts
├── security/      # Security scanning and compliance configs
└── terraform/     # AWS infrastructure as code
```

## Contribution Workflow

1. **Branch** off `main` using the pattern `feat/<issue-number>-<short-description>`.
2. **Make changes** in the relevant subdirectory.
3. **Validate** your changes locally (see commands below).
4. **Commit** with a clear message referencing the issue: `feat: add VPA config (#577)`.
5. **Push** and open a PR against `PinSpace-Org/GistPin:main`.
6. Request review from at least one infrastructure team member.

## Common Commands

### Terraform

```bash
cd infrastructure/terraform
terraform fmt -recursive     # format
terraform validate           # validate syntax
terraform plan               # preview changes
```

### Kubernetes

```bash
kubectl apply --dry-run=client -f k8s/   # dry-run all manifests
kubectl diff -f k8s/                     # diff against live cluster
```

### Docker

```bash
docker build -f docker/backend.Dockerfile .   # build backend image
docker compose -f docker/docker-compose.yml up # local stack
```

### Scripts

```bash
shellcheck infrastructure/scripts/*.sh   # lint shell scripts
```

## Code Standards

- Terraform: follow `terraform fmt` output; document all variables and outputs.
- Kubernetes: include resource `requests` and `limits` on every container.
- Shell scripts: pass `shellcheck` with no warnings; use `set -euo pipefail`.
- YAML: 2-space indent; no trailing whitespace.

## Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] Resource limits set on all K8s containers
- [ ] Terraform changes include a `terraform plan` output in the PR description
- [ ] New scripts have execute permissions (`chmod +x`) and pass `shellcheck`
- [ ] Docs updated if behaviour changes
