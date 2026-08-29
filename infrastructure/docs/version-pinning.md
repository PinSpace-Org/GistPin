# Kubernetes Resource Version Pinning

## Overview

GistPin enforces **explicit version pinning** for all Kubernetes resources to
prevent unexpected upgrades. No container image may use `:latest`, Helm charts
must declare a pinned `version`/`appVersion`, and API versions must not be
unstable (`alpha`/`beta`). Violations block CI and deployments.

## Policy

| Resource | Requirement | Example |
|----------|-------------|---------|
| Container image | Must reference an explicit tag (never `:latest`, never tagless) | `ghcr.io/spiffe/spire-server:1.14.1` |
| Helm chart | Must declare a pinned `version` / `appVersion` (semver `x.y.z`) | `version: "1.4.x"` is **not** allowed |
| API version | Must use the stable, non-`alpha`/`beta` version | `apps/v1`, `networking.k8s.io/v1` |

## How the Audit Works

The `infrastructure/scripts/audit-versions.sh` script scans the manifest tree
under `infrastructure/k8s`:

1. **Images** — flags any `image:` value ending in `:latest` or with no tag.
2. **Helm** — flags `Chart.yaml` files missing `version`, and HelmRelease chart
   references that use ranges/cluster wildcards instead of a pinned semver.
3. **API versions** — flags any `apiVersion` containing `alpha`/`beta`.

```bash
# Run the audit
./infrastructure/scripts/audit-versions.sh

# Emit a JSON report
./infrastructure/scripts/audit-versions.sh --report

# Allow specific known-good cases
./infrastructure/scripts/audit-versions.sh --allowlist infrastructure/ci/version-allowlist.txt

# Rewrite :latest -> :stable in place (use with care)
./infrastructure/scripts/audit-versions.sh --fix

# Audit a single subdirectory
./infrastructure/scripts/audit-versions.sh --dir infrastructure/k8s/flagagger
```

The script produces a structured JSON report in
`infrastructure/ci/reports/version-pinning-*.json` and exits non-zero when any
violation is found (or `--fix` cannot resolve it).

## Allowlist

Legitimate exceptions are recorded in
`infrastructure/ci/version-allowlist.txt`. Each allowlist entry corresponds to
a violation signature (file+line, image, or version value). Adding an entry
requires a code review explaining why the resource is exempt.

## How CI Blocks Unpinned Versions

The workflow `infrastructure/ci/version-pinning-check.yml` runs on every PR and
push touching `infrastructure/k8s`:

- Executes `audit-versions.sh` with the allowlist and a report.
- Uploads the report as a build artifact.
- **Fails the job** (blocking merges and main-branch deploys) if any unpinned
  version is found, with a hint to pin or allowlist.

## Pinning Conventions

Images are pinned to an explicit immutable digest where possible, or at minimum
a strict release tag:

```yaml
image: ghcr.io/spiffe/spire-server:1.14.1
imagePullPolicy: IfNotPresent
```

Helm releases always specify a concrete `version`:

```yaml
chart:
  spec:
    chart: secrets-store-csi-driver
    version: "1.4.6"
```

API versions use the stable group/version:

```yaml
apiVersion: apps/v1
```
