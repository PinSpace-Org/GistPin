#!/usr/bin/env python3
"""GistPin Kubernetes cluster capacity planning tool.

Collects current utilisation baselines, applies configurable growth rates,
projects capacity across CPU, memory, storage and pod-count dimensions,
and produces node scaling recommendations with cost implications.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any

try:
    import boto3
except ImportError:
    print("boto3 required: pip install boto3", file=sys.stderr)
    sys.exit(1)

try:
    import kubernetes
except ImportError:
    print("kubernetes required: pip install kubernetes", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DEFAULT_CLUSTER = "gistpin"
DEFAULT_NAMESPACE = "gistpin"
DEFAULT_FORECAST_DAYS = 90
DEFAULT_CPU_COST_PER_HOUR = 0.042  # t3.medium on-demand
DEFAULT_MEMORY_COST_PER_GB_MONTH = 23.0

RESOURCE_THRESHOLDS = {
    "cpu": {"warning": 70, "critical": 85},
    "memory": {"warning": 75, "critical": 90},
    "storage": {"warning": 75, "critical": 90},
    "pods": {"warning": 80, "critical": 95},
}

# ---------------------------------------------------------------------------
# Kubernetes helpers
# ---------------------------------------------------------------------------

def _k8s_clients():
    """Return CoreV1Api and MetricsV1beta1Api clients."""
    kubernetes.config.load_in_config()
    core = kubernetes.client.CoreV1Api()
    metrics_api = kubernetes.client.CustomObjectsApi()
    return core, metrics_api


def _node_capacity_and_requests(core, metrics_api, namespace: str):
    """Return per-node capacity, current requests and utilisation."""
    nodes = core.list_node().items
    pod_list = core.list_pod_for_all_namespaces(
        field_selector=f"status.phase=Running"
    ).items

    node_map: dict[str, dict[str, Any]] = {}
    for node in nodes:
        name = node.metadata.name
        alloc = node.status.allocatable
        node_map[name] = {
            "cpu_capacity": _parse_cpu(alloc.get("cpu", "0")),
            "cpu_requests": 0.0,
            "cpu_used": 0.0,
            "memory_capacity": _parse_mem(alloc.get("memory", "0")),
            "memory_requests": 0.0,
            "memory_used": 0.0,
            "pod_capacity": int(alloc.get("pods", "110")),
            "pod_count": 0,
        }

    for pod in pod_list:
        node = pod.spec.node_name
        if not node or node not in node_map:
            continue
        node_map[node]["pod_count"] += 1
        for container in pod.spec.containers:
            res = container.resources.requests or {}
            node_map[node]["cpu_requests"] += _parse_cpu(res.get("cpu", "0"))
            node_map[node]["memory_requests"] += _parse_mem(res.get("memory", "0"))

    # Attempt to pull real utilisation from metrics-server via custom objects
    try:
        metrics = metrics_api.list_cluster_custom_object(
            group="metrics.k8s.io",
            version="v1beta1",
            plural="nodes",
        )
        for m in metrics.get("items", []):
            name = m["metadata"]["name"]
            if name in node_map:
                node_map[name]["cpu_used"] = _parse_cpu(
                    m["usage"].get("cpu", "0")
                )
                node_map[name]["memory_used"] = _parse_mem(
                    m["usage"].get("memory", "0")
                )
    except Exception:
        # Metrics server may not be available; fall back to requests
        for n in node_map.values():
            n["cpu_used"] = n["cpu_requests"]
            n["memory_used"] = n["memory_requests"]

    return node_map


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _parse_cpu(val: str) -> float:
    """Convert Kubernetes CPU value to cores."""
    if val.endswith("m"):
        return float(val[:-1]) / 1000.0
    return float(val)


def _parse_mem(val: str) -> float:
    """Convert Kubernetes memory value to GiB."""
    if val.endswith("Ki"):
        return float(val[:-2]) / (1024 ** 2)
    if val.endswith("Mi"):
        return float(val[:-2]) / 1024.0
    if val.endswith("Gi"):
        return float(val[:-2])
    if val.endswith("Ti"):
        return float(val[:-2]) * 1024.0
    return float(val) / (1024 ** 3)


# ---------------------------------------------------------------------------
# Projection & recommendations
# ---------------------------------------------------------------------------

def _project(value: float, growth_rate: float, days: int) -> float:
    """Compound-growth projection."""
    return value * ((1 + growth_rate / 100) ** (days / 30))


def _utilisation_pct(used: float, capacity: float) -> float:
    return (used / capacity * 100) if capacity else 0.0


def _node_recommendation(
    current_nodes: int,
    projected_utilisation: float,
    resource: str,
) -> dict[str, Any]:
    threshold = RESOURCE_THRESHOLDS.get(resource, RESOURCE_THRESHOLDS["cpu"])
    if projected_utilisation >= threshold["critical"]:
        scale_factor = 1.5
        action = "SCALE UP (critical)"
    elif projected_utilisation >= threshold["warning"]:
        scale_factor = 1.25
        action = "SCALE UP (warning)"
    elif projected_utilisation < 30:
        scale_factor = 0.75
        action = "SCALE DOWN"
    else:
        scale_factor = 1.0
        action = "NO CHANGE"

    recommended = max(1, int(current_nodes * scale_factor + 0.5))
    return {
        "resource": resource,
        "current_nodes": current_nodes,
        "recommended_nodes": recommended,
        "action": action,
        "projected_utilisation_pct": round(projected_utilisation, 1),
    }


def _estimate_cost(nodes: int, cost_per_hour: float) -> dict[str, float]:
    monthly = nodes * cost_per_hour * 730
    return {
        "hourly": round(nodes * cost_per_hour, 4),
        "daily": round(nodes * cost_per_hour * 24, 2),
        "monthly": round(monthly, 2),
    }


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------

def _format_text(results: dict) -> str:
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("  GistPin Capacity Planning Report")
    lines.append(f"  Generated: {results['generated_at']}")
    lines.append(f"  Cluster:   {results['cluster']}")
    lines.append(f"  Forecast:  {results['forecast_days']} days")
    lines.append(f"  Growth:    {results['growth_rate']}% per month")
    lines.append("=" * 60)

    lines.append("")
    lines.append("--- Node Summary ---")
    for node in results["nodes"]:
        lines.append(f"  {node['name']}:")
        lines.append(
            f"    CPU:    {node['cpu_used']:.2f}/{node['cpu_capacity']:.2f} cores "
            f"({node['cpu_utilisation_pct']:.1f}%)"
        )
        lines.append(
            f"    Memory: {node['memory_used']:.1f}/{node['memory_capacity']:.1f} GiB "
            f"({node['memory_utilisation_pct']:.1f}%)"
        )
        lines.append(
            f"    Pods:   {node['pod_count']}/{node['pod_capacity']} "
            f"({node['pods_utilisation_pct']:.1f}%)"
        )

    lines.append("")
    lines.append("--- Projected Utilisation (after forecast period) ---")
    for proj in results["projections"]:
        lines.append(
            f"  {proj['resource']:>8s}: {proj['current_utilisation_pct']:5.1f}% "
            f"-> {proj['projected_utilisation_pct']:5.1f}%"
        )

    lines.append("")
    lines.append("--- Scaling Recommendations ---")
    for rec in results["recommendations"]:
        lines.append(
            f"  [{rec['action']}] {rec['resource']}: "
            f"{rec['current_nodes']} -> {rec['recommended_nodes']} nodes "
            f"(projected {rec['projected_utilisation_pct']:.1f}%)"
        )

    lines.append("")
    lines.append("--- Cost Implications ---")
    cost = results["cost_estimate"]
    lines.append(f"  Current:  ${cost['current']['monthly']:.2f}/mo")
    lines.append(f"  Projected: ${cost['projected']['monthly']:.2f}/mo")
    lines.append(f"  Delta:     ${cost['delta_monthly']:.2f}/mo ({cost['delta_pct']:.1f}%)")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="GistPin Kubernetes capacity planning tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  capacity-planner.py --growth-rate 10 --forecast-days 90\n"
            "  capacity-planner.py --output json --cost-per-hour 0.05\n"
            "  capacity-planner.py --cluster gistpin --namespace gistpin\n"
        ),
    )
    parser.add_argument(
        "--cluster",
        default=DEFAULT_CLUSTER,
        help="EKS cluster name (default: %(default)s)",
    )
    parser.add_argument(
        "--namespace",
        default=DEFAULT_NAMESPACE,
        help="Kubernetes namespace (default: %(default)s)",
    )
    parser.add_argument(
        "--growth-rate",
        type=float,
        default=5.0,
        help="Monthly growth rate percentage (default: %(default)s)",
    )
    parser.add_argument(
        "--forecast-days",
        type=int,
        default=DEFAULT_FORECAST_DAYS,
        help="Days to forecast ahead (default: %(default)s)",
    )
    parser.add_argument(
        "--cost-per-hour",
        type=float,
        default=DEFAULT_CPU_COST_PER_HOUR,
        help="Hourly cost per node in USD (default: %(default)s)",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    args = parser.parse_args()

    core, metrics_api = _k8s_clients()
    node_map = _node_capacity_and_requests(core, metrics_api, args.namespace)

    total_nodes = len(node_map)

    # Aggregate baselines
    total_cpu_cap = sum(n["cpu_capacity"] for n in node_map.values())
    total_cpu_used = sum(n["cpu_used"] for n in node_map.values())
    total_mem_cap = sum(n["memory_capacity"] for n in node_map.values())
    total_mem_used = sum(n["memory_used"] for n in node_map.values())
    total_pod_cap = sum(n["pod_capacity"] for n in node_map.values())
    total_pod_count = sum(n["pod_count"] for n in node_map.values())

    cpu_util = _utilisation_pct(total_cpu_used, total_cpu_cap)
    mem_util = _utilisation_pct(total_mem_used, total_mem_cap)
    pod_util = _utilisation_pct(total_pod_count, total_pod_cap)

    # Project forward
    proj_cpu = _project(cpu_util, args.growth_rate, args.forecast_days)
    proj_mem = _project(mem_util, args.growth_rate, args.forecast_days)
    proj_pod = _project(pod_util, args.growth_rate, args.forecast_days)

    projections = [
        {"resource": "cpu", "current_utilisation_pct": round(cpu_util, 1), "projected_utilisation_pct": round(proj_cpu, 1)},
        {"resource": "memory", "current_utilisation_pct": round(mem_util, 1), "projected_utilisation_pct": round(proj_mem, 1)},
        {"resource": "pods", "current_utilisation_pct": round(pod_util, 1), "projected_utilisation_pct": round(proj_pod, 1)},
    ]

    recommendations = [
        _node_recommendation(total_nodes, proj_cpu, "cpu"),
        _node_recommendation(total_nodes, proj_mem, "memory"),
        _node_recommendation(total_nodes, proj_pod, "pods"),
    ]

    # Use the most aggressive recommendation
    recommended_count = max(r["recommended_nodes"] for r in recommendations)
    worst_action = max(
        recommendations,
        key=lambda r: r["recommended_nodes"],
    )["action"]

    current_cost = _estimate_cost(total_nodes, args.cost_per_hour)
    projected_cost = _estimate_cost(recommended_count, args.cost_per_hour)
    delta = projected_cost["monthly"] - current_cost["monthly"]
    delta_pct = (delta / current_cost["monthly"] * 100) if current_cost["monthly"] else 0

    # Build per-node details
    nodes_detail = []
    for name, n in sorted(node_map.items()):
        nodes_detail.append({
            "name": name,
            "cpu_capacity": round(n["cpu_capacity"], 2),
            "cpu_used": round(n["cpu_used"], 2),
            "cpu_utilisation_pct": round(_utilisation_pct(n["cpu_used"], n["cpu_capacity"]), 1),
            "memory_capacity": round(n["memory_capacity"], 1),
            "memory_used": round(n["memory_used"], 1),
            "memory_utilisation_pct": round(_utilisation_pct(n["memory_used"], n["memory_capacity"]), 1),
            "pod_capacity": n["pod_capacity"],
            "pod_count": n["pod_count"],
            "pods_utilisation_pct": round(_utilisation_pct(n["pod_count"], n["pod_capacity"]), 1),
        })

    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cluster": args.cluster,
        "namespace": args.namespace,
        "forecast_days": args.forecast_days,
        "growth_rate": args.growth_rate,
        "total_nodes": total_nodes,
        "recommended_nodes": recommended_count,
        "overall_action": worst_action,
        "nodes": nodes_detail,
        "projections": projections,
        "recommendations": recommendations,
        "cost_estimate": {
            "current": current_cost,
            "projected": projected_cost,
            "delta_monthly": round(delta, 2),
            "delta_pct": round(delta_pct, 1),
            "assumptions": {
                "cost_per_node_hour": args.cost_per_hour,
                "hours_per_month": 730,
            },
        },
    }

    if args.output == "json":
        print(json.dumps(results, indent=2))
    else:
        print(_format_text(results))


if __name__ == "__main__":
    main()
