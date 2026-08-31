# Terraform State Encryption with Customer-Managed Keys

Terraform state contains sensitive data (resource ids, sometimes secrets), so it
is encrypted at rest with a **customer-managed KMS key (CMK)** rather than an
AWS-managed key. This gives us control over the key policy, rotation, and an
audit trail of every decrypt.

## Design

| Concern            | Approach                                                     |
| ------------------ | ----------------------------------------------------------- |
| Encryption key     | Customer-managed KMS key (`kms-state.tf`).                   |
| Rotation           | Automatic **annual** rotation (`enable_key_rotation = true`).|
| Key policy         | Least privilege: only named principals, only via S3 in-region. |
| Bucket SSE         | Default SSE-KMS with the CMK (`s3-state-encryption.tf`).     |
| Enforcement        | Bucket policy denies uploads not encrypted with the CMK.    |
| Audit              | S3 access logging + CloudTrail data events on decrypt.      |

## Components

| File                                               | Purpose                                       |
| -------------------------------------------------- | --------------------------------------------- |
| `infrastructure/terraform/kms-state.tf`            | CMK, alias, rotation, least-privilege policy. |
| `infrastructure/terraform/s3-state-encryption.tf`  | State bucket, SSE-KMS, deny-unencrypted policy, access logging. |
| `infrastructure/docs/state-encryption.md`          | This document.                                |

## Key policy (least privilege)

- **Root account** keeps administrative control (break-glass) but that alone
  does not grant data-plane encrypt/decrypt.
- **`state_key_user_arns`** — only the CI/CD role and platform admins that
  actually run Terraform may use the key, and only through S3 in the deployment
  region (`kms:ViaService` condition). This prevents the key from being used to
  decrypt state via any other path.

## Enforcement

The bucket policy denies:

1. `PutObject` without `aws:kms` server-side encryption, and
2. `PutObject` encrypted with any KMS key other than our CMK.

So even a misconfigured client cannot write unencrypted (or wrong-key) state.

## Rotation

`enable_key_rotation = true` rotates the backing key material annually. Rotation
is transparent — old state remains readable because KMS retains previous key
versions; no re-encryption of existing objects is required.

## Audit trail

- **S3 access logging** records object-level read/write to a dedicated
  `*-access-logs` bucket.
- **CloudTrail data events** on the bucket capture the `kms:Decrypt` calls, so
  every access to state — and the principal that made it — is auditable.

## Applying

```bash
terraform apply \
  -target=aws_kms_key.tf_state \
  -target=aws_s3_bucket.tf_state \
  -var 'state_bucket_name=gistpin-prod-tfstate' \
  -var 'state_key_user_arns=["arn:aws:iam::111122223333:role/ci-terraform"]'
```

Then point the backend at the encrypted bucket (see `backend-config.tf`). The
KMS key ARN is available from the `tf_state_kms_key_arn` output.
