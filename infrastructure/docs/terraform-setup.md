# Terraform Setup

## Prerequisites
- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials

## Backend Setup

Create the S3 bucket and DynamoDB table before initializing:

```bash
aws s3api create-bucket --bucket gistpin-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket gistpin-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name gistpin-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Initialize and Apply

```bash
terraform init
terraform plan -var="environment=staging"
terraform apply -var="environment=staging"
```
