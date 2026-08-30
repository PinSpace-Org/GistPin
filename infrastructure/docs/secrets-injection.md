# Secrets Injection via the Secrets Store CSI Driver

Secrets are injected directly into pod filesystems using the
[Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/), rather
than being baked into images or committed as plain Kubernetes Secrets. GistPin
supports two backends through this driver: **AWS Secrets Manager** and **Vault**.

> The base CSI driver and the Vault `SecretProviderClass` already exist
> (`install.yaml`, `secret-provider-class.yaml`). This change adds the **AWS
> Secrets Manager** provider and `SecretProviderClass` alongside them —
> the existing Vault configuration is preserved, not replaced.

## Components

| File                                                         | Purpose                                            |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `infrastructure/k8s/csi-secrets/install.yaml`                | Base CSI driver (sync + rotation enabled). *(existing)* |
| `infrastructure/k8s/csi-secrets/secret-provider-class.yaml`  | Vault `SecretProviderClass`. *(existing)*          |
| `infrastructure/k8s/csi-secrets/aws-provider.yaml`           | AWS Secrets Manager provider DaemonSet + IRSA ServiceAccount. |
| `infrastructure/k8s/csi-secrets/secret-provider-class-aws.yaml` | AWS `SecretProviderClass` + synced Secret + pod example. |
| `infrastructure/docs/secrets-injection.md`                   | This document.                                     |

## How it works (AWS Secrets Manager)

1. **CSI driver install** — `install.yaml` installs the base driver with
   `syncSecretEnabled: true` and `enableSecretRotation: true`
   (`rotationPollInterval: 300s`).
2. **AWS provider** — `aws-provider.yaml` adds the AWS provider DaemonSet so the
   driver can talk to AWS Secrets Manager, and an IRSA-bound ServiceAccount
   (`gistpin-aws-secrets`) whose IAM role can read the specific secrets.
3. **SecretProviderClass** — `secret-provider-class-aws.yaml` declares which
   Secrets Manager secrets to fetch, uses `jmesPath` to split JSON secrets into
   individual keys, and syncs selected values to native Kubernetes Secrets.
4. **Pod mounting** — a workload mounts the CSI volume (files appear under
   `/mnt/secrets-store`) and/or consumes the synced Secret as env vars.

## Access control (IRSA, least privilege)

The `gistpin-aws-secrets` ServiceAccount is annotated with an IAM role
(`eks.amazonaws.com/role-arn`). That role should grant
`secretsmanager:GetSecretValue` on **only** the specific secret ARNs the
workload needs — not `*`.

## Rotation handling

Rotation is driven by the CSI driver's `enableSecretRotation` +
`rotationPollInterval` (already set in `install.yaml`). When a secret's value
changes in AWS Secrets Manager:

- Mounted files under `/mnt/secrets-store` are updated within the poll interval.
- The synced Kubernetes Secret is updated too.

Applications that read the mounted files pick up new values automatically. Apps
that read env vars from the synced Secret need a restart (or the ConfigMap/Secret
hot-reload mechanism) to see the new value, since env vars are set at container
start.

## Consuming secrets

```yaml
# As files (auto-updated on rotation):
volumeMounts:
  - name: secrets-store
    mountPath: /mnt/secrets-store
    readOnly: true

# As env vars (from the synced Secret):
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: gistpin-db-credentials
        key: password
```

## Choosing a backend

| Backend             | Use when… |
| ------------------- | --------- |
| AWS Secrets Manager | The secret is AWS-native or benefits from AWS rotation lambdas. |
| Vault               | The secret is dynamic (DB creds, PKI) or shared across clouds. |

Both providers run side by side; a `SecretProviderClass` names exactly one.
