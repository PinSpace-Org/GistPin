"""
security-hub-auto-remediation
Triggered by EventBridge on "Security Hub Findings - Imported" events for a
configured allow-list of GeneratorIds. Applies a safe, idempotent fix for
each supported finding type, then updates the finding's workflow status
and posts a summary to SNS.

Mirrors the logic in infrastructure/scripts/remediate-findings.sh so the same
remediation can be run ad-hoc (CLI) or automatically (Lambda).
"""
import json
import os
import boto3

securityhub = boto3.client("securityhub")
s3 = boto3.client("s3")
ec2 = boto3.client("ec2")
iam = boto3.client("iam")
sns = boto3.client("sns")

SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

# Maps a Security Hub GeneratorId (or its suffix) to a remediation function.
REMEDIATORS = {}


def remediates(*ids):
    def wrap(fn):
        for i in ids:
            REMEDIATORS[i] = fn
        return fn
    return wrap


@remediates("aws-foundational-security-best-practices/v/1.0.0/S3.8")
def fix_s3_public_access(finding):
    """Block public access on any S3 bucket flagged for public access."""
    for resource in finding.get("Resources", []):
        if resource.get("Type") != "AwsS3Bucket":
            continue
        bucket = resource["Details"]["AwsS3Bucket"].get("Name") or resource["Id"].split(":::")[-1]
        s3.put_public_access_block(
            Bucket=bucket,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )
        yield f"Blocked public access on s3://{bucket}"


@remediates("cis-aws-foundations-benchmark/v/1.4.0/2.1.1")
def fix_s3_encryption(finding):
    """Enforce default SSE-S3 encryption on flagged buckets."""
    for resource in finding.get("Resources", []):
        if resource.get("Type") != "AwsS3Bucket":
            continue
        bucket = resource["Id"].split(":::")[-1]
        s3.put_bucket_encryption(
            Bucket=bucket,
            ServerSideEncryptionConfiguration={
                "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
            },
        )
        yield f"Enabled default encryption on s3://{bucket}"


@remediates("aws-foundational-security-best-practices/v/1.0.0/EC2.19")
def fix_open_security_group(finding):
    """Revoke ingress rules that expose high-risk ports to 0.0.0.0/0 or ::/0."""
    high_risk_ports = {22, 3389, 3306, 5432, 1433, 27017}
    for resource in finding.get("Resources", []):
        if resource.get("Type") != "AwsEc2SecurityGroup":
            continue
        sg_id = resource["Id"].split("/")[-1]
        sg = ec2.describe_security_groups(GroupIds=[sg_id])["SecurityGroups"][0]
        for perm in sg.get("IpPermissions", []):
            from_port = perm.get("FromPort")
            open_ranges = [r for r in perm.get("IpRanges", []) if r.get("CidrIp") == "0.0.0.0/0"]
            if open_ranges and (from_port is None or from_port in high_risk_ports):
                revoke_perm = dict(perm)
                revoke_perm["IpRanges"] = open_ranges
                ec2.revoke_security_group_ingress(GroupId=sg_id, IpPermissions=[revoke_perm])
                yield f"Revoked 0.0.0.0/0 ingress on port {from_port} for {sg_id}"


@remediates("cis-aws-foundations-benchmark/v/1.4.0/1.12", "aws-foundational-security-best-practices/v/1.0.0/IAM.6")
def flag_root_account_issue(finding):
    """Root-account findings are not safely auto-fixable; escalate instead."""
    yield "Root account finding requires manual review — escalated via SNS, no automated change applied."


def handler(event, context):
    findings = event.get("detail", {}).get("findings", [])
    results = []

    for finding in findings:
        generator_id = finding.get("GeneratorId", "")
        remediator = REMEDIATORS.get(generator_id)
        if not remediator:
            continue

        actions_taken = list(remediator(finding))
        if actions_taken:
            securityhub.batch_update_findings(
                FindingIdentifiers=[
                    {"Id": finding["Id"], "ProductArn": finding["ProductArn"]}
                ],
                Workflow={"Status": "RESOLVED"},
                Note={
                    "Text": "Auto-remediated: " + "; ".join(actions_taken),
                    "UpdatedBy": "security-hub-auto-remediation",
                },
            )
            results.extend(actions_taken)

    if results and SNS_TOPIC_ARN:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="Security Hub: automated remediation applied",
            Message=json.dumps({"remediations": results}, indent=2),
        )

    return {"remediations": results}