#!/usr/bin/env python3
"""
Terraform Drift Detection Parser
Parses `terraform show -json` output to classify resource changes as safe or manual.
Reads JSON from stdin and outputs structured drift summary to stdout.
Currently labeled as beta; the interface and output format are subject to change.
"""
import json
import sys
import os
import subprocess
from datetime import datetime, timezone

SAFE_CHANGES_PATH = os.environ.get("SAFE_CHANGES_PATH", "safe-changes.json")
MANUAL_CHANGES_PATH = os.environ.get("MANUAL_CHANGES_PATH", "manual-changes.json")

CRITICAL_RESOURCE_PATTERNS = [
    "aws_db_instance",
    "aws_db_subnet_group",
    "aws_rds_cluster",
    "aws_rds_cluster_instance",
    "aws_redshift_cluster",
    "aws_redshift_subnet_group",
    "aws_dynamodb_table",
    "aws_elasticache_cluster",
    "aws_elasticache_replication_group",
    "aws_elasticache_subnet_group",
    "aws_kms_key",
    "aws_kms_alias",
    "aws_iam_role",
    "aws_iam_role_policy",
    "aws_iam_user",
    "aws_iam_access_key",
    "aws_iam_account_password_policy",
    "aws_guardduty_detector",
    "aws_guardduty_organization_configuration",
    "aws_securityhub_account",
    "aws_securityhub_hub",
    "aws_cloudtrail",
    "aws_cloudtrail_event_data_store",
    "aws_config_configuration_recorder",
    "aws_config_configuration_recorder_status",
    "aws_config_delivery_channel",
    "aws_config_rule",
    "aws_vpc",
    "aws_internet_gateway",
    "aws_subnet",
    "aws_network_acl",
    "aws_route_table",
    "aws_route",
    "aws_route_table_association",
    "aws_eip",
    "aws_eip_association",
    "aws_nat_gateway",
    "aws_egress_only_internet_gateway",
    "aws_acm_certificate",
    "aws_acm_certificate_validation",
    "aws_route53_zone",
    "aws_route53_record",
    "aws_eks_cluster",
    "aws_eks_node_group",
    "aws_ecs_cluster",
    "aws_ecs_service",
    "aws_ecs_task_definition",
    "aws_s3_bucket",
    "aws_s3_bucket_policy",
    "aws_s3_bucket_versioning",
    "aws_lambda_function",
    "aws_lambda_permission",
    "aws_lambda_event_invoke_config",
    "aws_alb",
    "aws_alb_target_group",
    "aws_alb_target_group_attachment",
    "aws_lb_listener",
    "aws_lb_listener_certificate",
    "aws_autoscaling_group",
    "aws_launch_template",
    "aws_iam_instance_profile",
    "aws_key_pair",
    "aws_eks_addon",
    "aws_eks_fargate_profile",
    "aws_rds_cluster_parameter_group",
    "aws_db_parameter_group",
    "aws_elasticache_parameter_group",
    "aws_redshift_parameter_group",
    "aws_sns_topic",
    "aws_sns_topic_policy",
    "aws_sns_topic_subscription",
    "aws_sqs_queue",
    "aws_sqs_queue_policy",
    "aws_cloudwatch_metric_alarm",
    "aws_cloudwatch_dashboard",
    "aws_cloudwatch_log_group",
    "aws_cloudwatch_log_metric_filter",
    "aws_cloudwatch_log_stream",
    "aws_sagemaker_notebook_instance",
    "aws_opensearch_domain",
    "aws_elasticsearch_domain",
    "aws_neptune_cluster",
    "aws_neptune_cluster_instance",
    "aws_msk_cluster",
    "aws_msk_configuration",
    "aws_emr_cluster",
    "aws_emr_studio",
    "aws_fsx_lustre_file_system",
    "aws_fsx_ontap_file_system",
    "aws_fsx_openzfs_file_system",
    "aws_fsx_windows_file_system",
    "aws_ehr_repository",
    "aws_global_accelerator",
    "aws_global_accelerator_endpoint_group",
    "aws_ec2_transit_gateway",
    "aws_ec2_transit_gateway_vpc_attachment",
    "aws_ec2_client_vpn_endpoint",
    "aws_ec2_client_vpn_network_association",
    "aws_ec2_client_vpn_authorization_rule",
    "aws_organizations_organization",
    "aws_organizations_policy",
    "aws_organizations_policy_attachment",
]

SAFE_ATTRIBUTE_PREFIXES = [
    "tags.",
    "timeouts.",
    "lifecycle.",
    "time_sleep.",
    "null_resource.",
]

DEFAULT_SAFE_REASON = "non-critical resource type"


def load_plan():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            return {}
        return json.loads(raw_input)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON input: {e}", file=sys.stderr)
        sys.exit(1)


def extract_changes(plan_data):
    return plan_data.get("resource_changes", []) or []


def is_safe_attribute_change(change):
    paths = []
    for action_key in ("change", "after_unknown"):
        action_block = change.get(action_key, {})
        if not isinstance(action_block, dict):
            continue
        for change_type in ("update", "create", "delete", "replace"):
            actions = action_block.get(change_type, {})
            if isinstance(actions, dict):
                paths.extend(actions.keys())

    if not paths:
        return True, "no-op change"

    all_safe = all(
        any(path.startswith(prefix) for prefix in SAFE_ATTRIBUTE_PREFIXES)
        for path in paths
    )
    if all_safe:
        return True, "tag or metadata-only change"

    unsafe_attrs = [
        p for p in paths
        if not any(p.startswith(prefix) for prefix in SAFE_ATTRIBUTE_PREFIXES)
    ]
    return False, f"changes detected: {', '.join(unsafe_attrs)}"


def classify_resource_type(resource_address):
    for pattern in CRITICAL_RESOURCE_PATTERNS:
        if pattern in resource_address:
            return "manual", f"critical resource type: {pattern}"
    return "safe", DEFAULT_SAFE_REASON


def classify_change(change):
    address = (change.get("address") or "").replace("_", ".")
    resource_action = change.get("change", {}).get("actions", [])
    change_display = "/".join(resource_action) if resource_action else "no-op"

    for action in resource_action:
        if action in ("delete", "create"):
            category, reason = classify_resource_type(address)
            if category == "manual":
                return {
                    "category": "manual",
                    "reason": f"destructive {action} on critical resource - {reason}",
                    "remediation_action": "manual review required",
                    "address": address,
                    "change": change_display,
                    "resource_address": change.get("address"),
                }
            return {
                "category": "safe",
                "reason": f"non-critical {action} detected",
                "remediation_action": "terraform apply",
                "address": address,
                "change": change_display,
                "resource_address": change.get("address"),
            }
        if action in ("update", "replace"):
            safe, attr_reason = is_safe_attribute_change(change)
            if safe:
                return {
                    "category": "safe",
                    "reason": f"safe update: {attr_reason}",
                    "remediation_action": "terraform apply",
                    "address": address,
                    "change": change_display,
                    "resource_address": change.get("address"),
                }
            category, reason = classify_resource_type(address)
            if category == "manual":
                return {
                    "category": "manual",
                    "reason": f"update on critical resource - {reason} ({attr_reason})",
                    "remediation_action": "manual review required",
                    "address": address,
                    "change": change_display,
                    "resource_address": change.get("address"),
                }
            return {
                "category": "safe",
                "reason": f"updatable resource: {address}",
                "remediation_action": "terraform apply",
                "address": address,
                "change": change_display,
                "resource_address": change.get("address"),
            }

    return {
        "category": "manual",
        "reason": "unknown or empty action set",
        "remediation_action": "manual review required",
        "address": address,
        "change": change_display,
        "resource_address": change.get("address"),
    }


def deduplicate_changes(changes):
    seen = {}
    deduped = []
    for change in changes:
        address = (change.get("address") or "").strip()
        action_block = change.get("change", {}) or {}
        actions = action_block.get("actions", []) or []
        action_str = "/".join(sorted(actions))
        key = f"{address}:{action_str}"
        if key not in seen:
            seen[key] = change
            deduped.append(change)
    return deduped


def format_change_for_output(classified):
    return {
        "address": classified["address"],
        "change": classified["change"],
        "resource": classified["resource_address"],
        "category": classified["category"],
        "reason": classified["reason"],
        "remediation": classified["remediation_action"],
    }


def kind_has_destructive_change(change_block):
    if not isinstance(change_block, dict):
        return False
    for action in ("create", "delete", "replace"):
        if change_block.get(action):
            return True
    return False


def detect_external_drift(plan_data):
    try:
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD", "--", os.path.join(repo_root, "infrastructure")],
            capture_output=True,
            text=True,
            check=False,
            cwd=repo_root,
        )
        modified = set(result.stdout.strip().splitlines()) if result.stdout.strip() else set()
        return len([f for f in modified if "infrastructure/terraform/" in f]) > 0
    except Exception:
        return False


def main():
    os.environ.setdefault("SAFE_CHANGES_PATH", SAFE_CHANGES_PATH)
    os.environ.setdefault("MANUAL_CHANGES_PATH", MANUAL_CHANGES_PATH)

    plan_data = load_plan()
    raw_changes = extract_changes(plan_data)

    filtered_changes = [
        c for c in raw_changes if not (
            (c.get("address") or "").startswith("null_resource.")
            or (c.get("address") or "").startswith("time_")
            or (c.get("address") or "").startswith("external.")
        )
    ]

    if not filtered_changes:
        safe = []
        manual = []
        is_drift = True
    else:
        is_drift = detect_external_drift(plan_data)
        changes = deduplicate_changes(filtered_changes)
        classified = [classify_change(c) for c in changes]

        for c in classified:
            if c["category"] == "manual" and is_drift:
                c["reason"] += " - externally applied change detected"

        safe = [format_change_for_output(c) for c in classified if c["category"] == "safe"]
        manual = [format_change_for_output(c) for c in classified if c["category"] == "manual"]

    for path, data in [(SAFE_CHANGES_PATH, safe), (MANUAL_CHANGES_PATH, manual)]:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_changes": len(safe) + len(manual),
        "safe_count": len(safe),
        "manual_count": len(manual),
        "drift_detected": is_drift,
        "warning": "beta - interface may change",
        "safe": safe,
        "manual": manual,
    }
    print(json.dumps(summary, indent=2))

    sys.exit(1 if manual else 0)


if __name__ == "__main__":
    main()
