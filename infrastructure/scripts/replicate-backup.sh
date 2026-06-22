
#!/bin/bash

# This script is responsible for creating a database backup and uploading it to the primary S3 bucket.
# From there, S3 replication will automatically copy the backup to a secondary region.

set -e

# --- Configuration ---
# Database connection details
DB_HOST="your_db_host"
DB_USER="your_db_user"
DB_NAME="your_db_name"
DB_PASSWORD="your_db_password" # It's recommended to use a more secure way to handle passwords, like AWS Secrets Manager.

# S3 Bucket for primary backups
PRIMARY_BUCKET="primary-backup-bucket"

# Backup file name
BACKUP_FILE="db_backup_$(date +%Y%m%d%H%M%S).sql.gz"
LOCAL_BACKUP_PATH="/tmp/${BACKUP_FILE}"

# --- Main script ---

echo "Starting database backup..."

# Create a compressed backup of the database
# The command will depend on your database system (e.g., pg_dump for PostgreSQL, mysqldump for MySQL)
# Example for PostgreSQL:
# pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $LOCAL_BACKUP_PATH

# For this example, we'll create a placeholder file
echo "This is a placeholder for the actual database backup." > /tmp/placeholder.txt
gzip -c /tmp/placeholder.txt > $LOCAL_BACKUP_PATH
rm /tmp/placeholder.txt

echo "Backup created locally at ${LOCAL_BACKUP_PATH}"

# Upload the backup to the primary S3 bucket
echo "Uploading backup to S3 bucket: ${PRIMARY_BUCKET}"
aws s3 cp $LOCAL_BACKUP_PATH s3://${PRIMARY_BUCKET}/${BACKUP_FILE}

# Integrity Verification: Calculate and upload a checksum for the backup
echo "Calculating checksum for integrity verification..."
CHECKSUM=$(sha256sum $LOCAL_BACKUP_PATH | awk '{ print $1 }')
echo $CHECKSUM > ${LOCAL_BACKUP_PATH}.sha256
aws s3 cp ${LOCAL_BACKUP_PATH}.sha256 s3://${PRIMARY_BUCKET}/${BACKUP_FILE}.sha256
echo "Checksum uploaded to S3."

# Clean up local backup files
echo "Cleaning up local files..."
rm $LOCAL_BACKUP_PATH
rm ${LOCAL_BACKUP_PATH}.sha256

echo "Backup process completed successfully."
echo "The backup will be replicated to the secondary region automatically by S3."

# --- Retention Policy ---
# S3 Lifecycle Policies should be configured on the bucket to automatically handle old backups.
# For example, you can set a policy to move backups to a cheaper storage class (like Glacier) after 30 days
# and delete them after a certain period (e.g., 1 year).
# This is typically configured in the Terraform S3 bucket resource definition.

# --- Restore Testing ---
# Regular restore tests are crucial to ensure backups are valid.
# A separate script or CI/CD job should be created to:
# 1. Fetch a recent backup from S3.
# 2. Restore it to a temporary database.
# 3. Run integrity checks and queries against the restored data.
# 4. Tear down the temporary database.