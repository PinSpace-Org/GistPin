
# Backup and Disaster Recovery Strategy

This document outlines the strategy for database backups, including cross-region replication for disaster recovery.

## 1. Overview

Our backup strategy is designed to be resilient and to ensure business continuity in the event of a regional outage. It involves:

- **Regular Backups**: Automated daily backups of the primary database.
- **Geo-Redundancy**: Replication of backups to a secondary geographical region.
- **Encryption**: Backups are encrypted both in transit and at rest.
- **Integrity Checks**: Regular verification of backup integrity.
- **Retention Policies**: A defined lifecycle for backup storage and deletion.
- **Restore Testing**: Periodic testing of the restore process.

## 2. Backup Process

1.  **Backup Creation**: A scheduled job runs the `replicate-backup.sh` script daily. This script performs a database dump, compresses it, and calculates a SHA256 checksum for integrity.

2.  **Primary Storage**: The compressed backup and its checksum file are uploaded to the primary S3 bucket located in the `us-east-1` region.

3.  **Cross-Region Replication**: S3 is configured to automatically replicate all new objects from the primary backup bucket to a secondary bucket in the `us-west-2` region. This provides a geo-redundant copy of our backups.

## 3. Infrastructure

The backup infrastructure is managed using Terraform. The relevant configuration can be found in `infrastructure/terraform/cross-region-backup.tf`. This file defines:

- The secondary S3 bucket for replicated backups.
- IAM roles and policies required for S3 replication.
- The replication configuration itself.

## 4. Encryption

- **In Transit**: All communication with AWS S3 uses SSL/TLS, encrypting the backups while they are being uploaded.
- **At Rest**: The S3 buckets are configured with server-side encryption (SSE-S3), which encrypts the backup files once they are stored.

## 5. Integrity Verification

For each backup, a SHA256 checksum is generated and stored alongside the backup file in S3. During a restore process, this checksum can be used to verify that the backup file has not been corrupted.

## 6. Retention Policies

S3 Lifecycle Policies are used to manage the retention of backups:

- **Standard-IA**: Backups are stored in the `STANDARD_INFREQUENT_ACCESS` storage class to reduce costs.
- **Glacier**: After 90 days, backups are moved to `GLACIER` for long-term archival.
- **Deletion**: Backups are permanently deleted after 365 days.

These policies are defined in the Terraform configuration for the S3 buckets.

## 7. Restore Testing

To ensure our backups are reliable, we perform regular restore tests. This process is automated and involves:

1.  **Fetching a Backup**: A recent backup is downloaded from the secondary S3 bucket.
2.  **Restoring to a Test Environment**: The backup is restored to a temporary, isolated database instance.
3.  **Verification**: Automated tests are run against the restored database to ensure data integrity and consistency.
4.  **Cleanup**: The temporary database and its resources are destroyed after the test is complete.

This process is managed by a CI/CD pipeline, which is triggered on a weekly basis.

## 8. Disaster Recovery Plan

In the event of a failure in the primary region (`us-east-1`), the following steps should be taken to restore service from a backup:

1.  **Initiate Recovery**: The on-call engineer will declare a disaster and begin the recovery process.
2.  **Provision New Infrastructure**: A new set of infrastructure will be provisioned in the secondary region (`us-west-2`) using Terraform.
3.  **Restore Database**: The latest backup will be retrieved from the `us-west-2` S3 bucket and restored to the new database instance.
4.  **Update DNS**: DNS records will be updated to point to the new application endpoints in the secondary region.
5.  **Verify Service**: The application will be tested to ensure it is fully functional.