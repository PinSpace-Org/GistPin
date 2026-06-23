# Infrastructure Tool Requirements

All tools below are required for local infrastructure development unless marked optional.

## Core Tools

| Tool | Min Version | Install |
|------|-------------|---------|
| [Node.js](https://nodejs.org) | 20 LTS | `nvm install 20` |
| [Docker](https://docs.docker.com/get-docker/) | 24 | Package manager or Docker Desktop |
| [Docker Compose](https://docs.docker.com/compose/) | 2.20 | Bundled with Docker Desktop |
| [Git](https://git-scm.com) | 2.40 | Package manager |

## Infrastructure Tools

| Tool | Min Version | Install |
|------|-------------|---------|
| [Terraform](https://developer.hashicorp.com/terraform/install) | 1.7 | `tfenv install 1.7.0` |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | 1.28 | Package manager |
| [Helm](https://helm.sh/docs/intro/install/) | 3.14 | `brew install helm` |
| [AWS CLI](https://aws.amazon.com/cli/) | 2 | Package manager |

## Code Quality Tools

| Tool | Min Version | Install | Purpose |
|------|-------------|---------|---------|
| [shellcheck](https://www.shellcheck.net) | 0.9 | `apt install shellcheck` | Shell script linting |
| [tflint](https://github.com/terraform-linters/tflint) | 0.50 | [GitHub releases](https://github.com/terraform-linters/tflint/releases) | Terraform linting |
| [tfsec](https://github.com/aquasecurity/tfsec) | 1.28 | `brew install tfsec` | Terraform security scanning |

## Optional Tools

| Tool | Purpose |
|------|---------|
| [k9s](https://k9scli.io) | Terminal Kubernetes UI |
| [kubectx / kubens](https://github.com/ahmetb/kubectx) | Quick context and namespace switching |
| [tfenv](https://github.com/tfutils/tfenv) | Terraform version manager |
| [nvm](https://github.com/nvm-sh/nvm) | Node.js version manager |

## Version Verification

Run the following to confirm all core tools are installed:

```bash
node --version   # v20.x.x
docker --version # Docker version 24.x.x
terraform version # Terraform v1.7.x
kubectl version --client # v1.28.x
```
