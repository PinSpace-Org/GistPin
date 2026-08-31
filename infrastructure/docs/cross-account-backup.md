# Cross-Account S3 Backup Replication

Critical S3 buckets are replicated to a **separate AWS account** for disaster
recovery. Keeping the DR copy in a different account means a compromise or
mistake in the primary account (deletion, ransomware, credential leak) cannot
also destroy the backups.

## What is replicated

For each bucket in `replicated_buckets`, all objects — including delete markers
— are replicated to the corresponding destination bucket in the DR account,
using **Replication Time Control (RTC)** with a 15-minute objective.

## Encryption preservation

- Source objects encrypted with KMS are replicated (the replication role is
  granted `kms:Decrypt` on the source).
- Replicas are **re-encrypted** with the DR account's own KMS key
  (`dr_kms_key_arn`), so the DR account controls the keys protecting its copy.
- `access_control_translation` transfers object ownership to the destination
  account, which is required for the DR account to read/restore the replicas
  independently.

## Components

| File                                                    | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `infrastructure/terraform/cross-account-replication.tf` | Versioning, replication rules, RTC, latency alarm. |
| `infrastructure/terraform/replication-iam.tf`           | Replication role/policy + destination bucket policy. |
| `infrastructure/docs/cross-account-backup.md`           | This document.                                 |

## Two-account apply

Replication spans two accounts, so applying it is a two-step operation:

1. **Source account** — apply `cross-account-replication.tf` and
   `replication-iam.tf`. This creates the replication role and rules.
2. **DR account** — apply the `destination_bucket_policy_json` output as the
   bucket policy on each destination bucket (using a provider aliased to the DR
   account). This authorizes the source role to write replicas.

## Replication status monitoring

- **RTC** bounds replication to 15 minutes and emits `ReplicationLatency`.
- A CloudWatch alarm (`replication-latency-*`) fires when latency exceeds the
  15-minute objective, so a stalled replication is caught before it becomes a
  DR gap.
- S3 replication metrics are enabled per rule for dashboarding.

## Failover procedure

If the primary account/region is lost:

1. **Confirm the DR copy is current** — check `ReplicationLatency` and the last
   replicated object timestamp on the destination buckets.
2. **Freeze replication** if the source is compromised (to avoid replicating a
   bad state) by disabling the replication rule.
3. **Repoint consumers** at the DR buckets (DNS / config), using the DR
   account's KMS key for decryption.
4. **Restore** — objects are already in the DR account and owned by it, so they
   can be read directly; no cross-account restore dance is required.
5. **Re-establish** a new DR target once the primary is recovered, and reverse
   the replication direction if needed.

## Recovery objectives

| Objective | Value        | Backed by                                  |
| --------- | ------------ | ------------------------------------------ |
| RPO       | ≤ 15 minutes | Replication Time Control (RTC).            |
| RTO       | Minutes      | Replicas pre-exist in the DR account, owned by it. |
