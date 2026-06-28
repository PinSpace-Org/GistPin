#!/usr/bin/env python3
"""Infrastructure change risk scoring algorithm."""

import json
import os
import sys
from typing import Any

BLAST_RADIUS_WEIGHTS = {
    "single_pod": 10,
    "multiple_pods": 20,
    "service": 30,
    "namespace": 50,
    "cluster": 80,
    "global": 100,
}

REVERSIBILITY_SCORES = {
    "full_rollback": 10,
    "requires_manual": 50,
    "irreversible": 90,
}

DEPENDENCY_COUNTS = {
    "no_dependencies": 10,
    "one_to_three": 30,
    "four_to_ten": 50,
    "more_than_ten": 80,
}

RESOURCE_TYPES = {
    "aws_s3_bucket": {"blast_radius": "namespace", "reversibility": "full_rollback"},
    "aws_db_instance": {"blast_radius": "service", "reversibility": "requires_manual"},
    "aws_eks_cluster": {"blast_radius": "cluster", "reversibility": "irreversible"},
    "aws_iam_role": {"blast_radius": "namespace", "reversibility": "full_rollback"},
    "aws_lb": {"blast_radius": "namespace", "reversibility": "full_rollback"},
    "kubernetes_deployment": {"blast_radius": "multiple_pods", "reversibility": "full_rollback"},
    "kubernetes_service": {"blast_radius": "service", "reversibility": "full_rollback"},
    "kubernetes_namespace": {"blast_radius": "namespace", "reversibility": "full_rollback"},
    "kubernetes_clusterrole": {"blast_radius": "cluster", "reversibility": "requires_manual"},
    "random": {"blast_radius": "single_pod", "reversibility": "full_rollback"},
}


def score_resource(resource_type: str, dependency_count: int, has_backup: bool) -> int:
    props = RESOURCE_TYPES.get(resource_type, RESOURCE_TYPES["random"])

    blast_score = BLAST_RADIUS_WEIGHTS.get(props["blast_radius"], 50)
    reversibility_score = REVERSIBILITY_SCORES.get(props["reversibility"], 50)

    if dependency_count <= 0:
        dep_score = DEPENDENCY_COUNTS["no_dependencies"]
    elif dependency_count <= 3:
        dep_score = DEPENDENCY_COUNTS["one_to_three"]
    elif dependency_count <= 10:
        dep_score = DEPENDENCY_COUNTS["four_to_ten"]
    else:
        dep_score = DEPENDENCY_COUNTS["more_than_ten"]

    backup_bonus = 0 if has_backup else 10

    total = (blast_score * 0.4) + (reversibility_score * 0.35) + (dep_score * 0.15) + (backup_bonus * 0.1)
    return min(int(total), 100)


def classify_score(score: int) -> str:
    if score <= 25:
        return "low"
    elif score <= 50:
        return "medium"
    elif score <= 75:
        return "high"
    else:
        return "critical"


def score_pr_changes(changes: list[dict[str, Any]]) -> dict[str, Any]:
    total_score = 0
    resources = []

    for change in changes:
        rtype = change.get("resource_type", "unknown")
        deps = change.get("dependency_count", 0)
        backup = change.get("has_backup", False)

        score = score_resource(rtype, deps, backup)
        total_score += score

        resources.append({
            "resource": change.get("address", "unknown"),
            "type": rtype,
            "score": score,
            "classification": classify_score(score),
        })

    avg_score = total_score / max(len(resources), 1)
    max_score = max((r["score"] for r in resources), default=0)
    highest_risk = max((r for r in resources), key=lambda x: x["score"], default=None)

    return {
        "overall_score": int(avg_score),
        "overall_classification": classify_score(int(avg_score)),
        "max_risk_score": max_score,
        "highest_risk_resource": highest_risk,
        "resource_count": len(resources),
        "resources": resources,
    }


def main():
    input_data = json.loads(sys.stdin.read()) if not sys.stdin.isatty() else {"changes": []}
    result = score_pr_changes(input_data.get("changes", []))
    print(json.dumps(result, indent=2))

    dry_run = os.environ.get("DRY_RUN", "false") == "true"
    output_path = os.environ.get("REPORT_PATH", "infrastructure/ci/reports/risk-score.json")
    if not dry_run:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)


if __name__ == "__main__":
    main()
