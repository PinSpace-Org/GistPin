# Terraform External Data Sources

This directory contains dynamic lookups for cloud infrastructure resources.

## Data Sources Included
- **AMI Lookup**: Fetches the latest Amazon Linux 2 HVM AMI by criteria.
- **K8s Version Lookup**: Retrieves the latest supported Kubernetes control plane version.
- **Availability Zone Lookup**: Retrieves active AZs in the current AWS region.
- **ACM Certificate Lookup**: Fetches the latest issued certificate ARN for specified domain names.
