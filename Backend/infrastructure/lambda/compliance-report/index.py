"""
security-hub-weekly-compliance-report
Triggered weekly by EventBridge. Pulls active Security Hub findings,
summarizes compliance posture (by standard, severity, and status),
writes a JSON + Markdown report to S3, and publishes a short summary to SNS.
"""
import datetime
import json
import os
import boto3

securityhub = boto3.client("securityhub")
s3 = boto3.client("s3")
sns = boto3.client("sns")

REPORT_BUCKET = os.environ["REPORT_BUCKET"]
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")


def get_active_findings():
    findings = []
    paginator = securityhub.get_paginator("get_findings")
    for page in paginator.paginate(
        Filters={
            "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
            "WorkflowStatus": [
                {"Value": "NEW", "Comparison": "EQUALS"},
                {"Value": "NOTIFIED", "Comparison": "EQUALS"},
            ],
        }
    ):
        findings.extend(page["Findings"])
    return findings


def summarize(findings):
    by_severity = {}
    by_standard = {}
    by_status = {}

    for f in findings:
        sev = f.get("Severity", {}).get("Label", "UNKNOWN")
        by_severity[sev] = by_severity.get(sev, 0) + 1

        status = f.get("Compliance", {}).get("Status", "UNKNOWN")
        by_status[status] = by_status.get(status, 0) + 1

        for standard in f.get("Compliance", {}).get("AssociatedStandards", []):
            sid = standard.get("StandardsId", "unknown-standard")
            by_standard[sid] = by_standard.get(sid, 0) + 1

    return {
        "total_active_findings": len(findings),
        "by_severity": by_severity,
        "by_compliance_status": by_status,
        "by_standard": by_standard,
    }


def render_markdown(summary, week_of):
    lines = [
        f"# Weekly Security Hub Compliance Report — {week_of}",
        "",
        f"**Total active findings:** {summary['total_active_findings']}",
        "",
        "## By Severity",
    ]
    for sev, count in sorted(summary["by_severity"].items()):
        lines.append(f"- {sev}: {count}")

    lines += ["", "## By Compliance Status"]
    for status, count in sorted(summary["by_compliance_status"].items()):
        lines.append(f"- {status}: {count}")

    lines += ["", "## By Standard"]
    for standard, count in sorted(summary["by_standard"].items()):
        lines.append(f"- {standard}: {count}")

    return "\n".join(lines) + "\n"


def handler(event, context):
    week_of = datetime.date.today().isoformat()
    findings = get_active_findings()
    summary = summarize(findings)
    markdown = render_markdown(summary, week_of)

    json_key = f"reports/{week_of}/summary.json"
    md_key = f"reports/{week_of}/summary.md"

    s3.put_object(Bucket=REPORT_BUCKET, Key=json_key, Body=json.dumps(summary, indent=2))
    s3.put_object(Bucket=REPORT_BUCKET, Key=md_key, Body=markdown)

    if SNS_TOPIC_ARN:
        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=f"Weekly Security Hub Compliance Report — {week_of}",
            Message=(
                f"Compliance report for {week_of} generated.\n\n"
                f"Total active findings: {summary['total_active_findings']}\n"
                f"By severity: {summary['by_severity']}\n\n"
                f"Full report: s3://{REPORT_BUCKET}/{md_key}"
            ),
        )

    return {"bucket": REPORT_BUCKET, "json_key": json_key, "md_key": md_key, "summary": summary}