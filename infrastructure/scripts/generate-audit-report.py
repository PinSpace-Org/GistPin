#!/usr/bin/env python3
"""
Automated audit report generator for compliance evidence.

Generates a formatted audit-ready report from collected evidence.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

FRAMEWORK_CONTROLS = {
    "soc2": {
        "CC6.1": {"name": "Logical Access Controls", "category": "access", "description": "Restrict logical access to information assets"},
        "CC6.2": {"name": "Authentication Mechanisms", "category": "access", "description": "Authenticate users before granting access"},
        "CC6.3": {"name": "Access Authorization", "category": "access", "description": "Authorize access based on roles"},
        "CC6.6": {"name": "System Boundaries", "category": "network", "description": "Restrict access at system boundaries"},
        "CC6.7": {"name": "Data Transmission", "category": "encryption", "description": "Protect data in transit"},
        "CC7.1": {"name": "Vulnerability Management", "category": "monitoring", "description": "Detect vulnerabilities"},
        "CC7.2": {"name": "Anomaly Detection", "category": "monitoring", "description": "Monitor for anomalies"},
        "CC8.1": {"name": "Change Management", "category": "configuration", "description": "Manage changes to infrastructure"},
    },
    "cis": {
        "1.1": {"name": "CloudTrail Enabled", "category": "monitoring", "description": "Enable CloudTrail in all regions"},
        "1.2": {"name": "CloudTrail Log Validation", "category": "monitoring", "description": "Enable log file validation"},
        "2.1": {"name": "MFA Enabled", "category": "access", "description": "Enable MFA for root account"},
        "2.2": {"name": "Unused Credentials", "category": "access", "description": "Remove unused credentials"},
        "3.1": {"name": "Security Groups", "category": "network", "description": "No unrestricted security groups"},
        "3.2": {"name": "VPC Flow Logs", "category": "network", "description": "Enable VPC flow logs"},
        "4.1": {"name": "S3 Bucket Policy", "category": "encryption", "description": "Enforce S3 bucket policy"},
        "5.1": {"name": "EBS Encryption", "category": "encryption", "description": "Enable EBS encryption"},
    },
}


def collect_evidence_summary(evidence_dir: str, framework: str) -> dict:
    summary = {
        "framework": framework,
        "evidence_dir": evidence_dir,
        "categories": {},
        "total_files": 0,
        "controls_checked": 0,
        "controls_passed": 0,
        "controls_failed": 0,
        "controls_skipped": 0,
    }

    controls = FRAMEWORK_CONTROLS.get(framework, {})

    for control_id, control_info in controls.items():
        category = control_info["category"]
        category_dir = os.path.join(evidence_dir, category)

        if category not in summary["categories"]:
            summary["categories"][category] = {
                "files": [],
                "controls": [],
                "status": "unknown",
            }

        evidence_files = []
        if os.path.exists(category_dir):
            evidence_files = [
                f for f in os.listdir(category_dir)
                if os.path.isfile(os.path.join(category_dir, f))
            ]
            summary["total_files"] += len(evidence_files)

        summary["categories"][category]["files"] = evidence_files

        status = "pass" if evidence_files else "skipped"
        summary["categories"][category]["controls"].append({
            "id": control_id,
            "name": control_info["name"],
            "description": control_info["description"],
            "status": status,
            "evidence_count": len(evidence_files),
        })

        summary["controls_checked"] += 1
        if status == "pass":
            summary["controls_passed"] += 1
        elif status == "failed":
            summary["controls_failed"] += 1
        else:
            summary["controls_skipped"] += 1

    for category_data in summary["categories"].values():
        passed = sum(1 for c in category_data["controls"] if c["status"] == "pass")
        total = len(category_data["controls"])
        if total > 0:
            category_data["status"] = "pass" if passed == total else "partial" if passed > 0 else "fail"
        category_data["pass_rate"] = round(passed / total * 100, 1) if total > 0 else 0

    return summary


def generate_markdown_report(summary: dict, output_path: str):
    controls = FRAMEWORK_CONTROLS.get(summary["framework"], {})

    lines = [
        f"# {summary['framework'].upper()} Compliance Audit Report",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"**Framework:** {summary['framework'].upper()}",
        f"**Evidence Directory:** `{summary['evidence_dir']}`",
        "",
        "## Executive Summary",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Controls Checked | {summary['controls_checked']} |",
        f"| Controls Passed | {summary['controls_passed']} |",
        f"| Controls Failed | {summary['controls_failed']} |",
        f"| Controls Skipped | {summary['controls_skipped']} |",
        f"| Total Evidence Files | {summary['total_files']} |",
        f"| Overall Pass Rate | {round(summary['controls_passed'] / max(summary['controls_checked'], 1) * 100, 1)}% |",
        "",
        "## Category Breakdown",
        "",
    ]

    for category, data in summary["categories"].items():
        lines.append(f"### {category.title()}")
        lines.append("")
        lines.append(f"**Status:** {data['status']} | **Pass Rate:** {data['pass_rate']}%")
        lines.append("")
        lines.append("| Control | Description | Status | Evidence Files |")
        lines.append("|---------|-------------|--------|----------------|")

        for control in data["controls"]:
            status_icon = {"pass": "✅", "fail": "❌", "skipped": "⏭️"}.get(control["status"], "❓")
            lines.append(
                f"| {control['id']} - {control['name']} | {control['description']} | {status_icon} {control['status']} | {control['evidence_count']} |"
            )

        lines.append("")

    lines.extend([
        "## Remediation Priorities",
        "",
    ])

    failed_controls = []
    for category, data in summary["categories"].items():
        for control in data["controls"]:
            if control["status"] != "pass":
                failed_controls.append(control)

    if failed_controls:
        for i, control in enumerate(failed_controls, 1):
            lines.append(f"{i}. **{control['id']}** - {control['name']}: {control['description']}")
    else:
        lines.append("No remediation needed - all controls are passing.")

    lines.extend([
        "",
        "---",
        f"*Report generated by GistPin compliance automation*",
    ])

    with open(output_path, "w") as f:
        f.write("\n".join(lines))


def main():
    if len(sys.argv) < 3:
        print("Usage: generate-audit-report.py <evidence_dir> <framework>")
        sys.exit(1)

    evidence_dir = sys.argv[1]
    framework = sys.argv[2]

    if not os.path.exists(evidence_dir):
        print(f"Evidence directory not found: {evidence_dir}")
        sys.exit(1)

    print(f"Generating {framework.upper()} audit report...")

    summary = collect_evidence_summary(evidence_dir, framework)

    report_path = os.path.join(evidence_dir, f"{framework}-audit-report.md")
    generate_markdown_report(summary, report_path)

    json_path = os.path.join(evidence_dir, f"{framework}-audit-summary.json")
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Report generated: {report_path}")
    print(f"Summary JSON: {json_path}")
    print(f"Controls: {summary['controls_passed']}/{summary['controls_checked']} passed")


if __name__ == "__main__":
    main()
