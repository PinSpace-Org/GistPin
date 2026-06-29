#!/usr/bin/env python3
"""GistPin cloud spend forecasting — AWS Cost Explorer backed projections."""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from collections import defaultdict

try:
    import boto3
except ImportError:
    print("boto3 required: pip install boto3", file=sys.stderr)
    sys.exit(1)


def fetch_cost_data(ce, granularity="DAILY", days=90):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    resp = ce.get_cost_and_usage(
        TimePeriod={"Start": start.strftime("%Y-%m-%d"), "End": end.strftime("%Y-%m-%d")},
        Granularity=granularity,
        Metrics=["UnblendedCost", "UsageQuantity"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    )
    return resp["ResultsByTime"]


def linear_forecast(values, forecast_days=90):
    n = len(values)
    if n < 2:
        return None, None
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    slope = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values)) / \
            sum((i - x_mean) ** 2 for i in range(n))
    intercept = y_mean - slope * x_mean
    forecast = intercept + slope * (n - 1 + forecast_days)
    return forecast, slope


def detect_savings(ce):
    results = []
    resp = ce.get_rightsizing_recommendation(
        Service="AmazonEC2",
        Filter={"Metrics": {"vCPU": {"Value": "4"}}},
    )
    for rec in resp.get("RightsizingRecommendations", []):
        results.append({
            "resource": rec.get("ResourceId"),
            "current_cost": rec.get("CurrentCost", {}).get("EstimatedMonthlySavings", "0"),
            "savings": rec.get("RightsizingType", "No recommendation"),
        })
    return results


def build_resource_growth(daily_data):
    by_service = defaultdict(list)
    for day in daily_data:
        for group in day.get("Groups", []):
            service = group["Keys"][0]
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            by_service[service].append(cost)
    projections = {}
    for service, amounts in by_service.items():
        forecast, slope = linear_forecast(amounts, 90)
        if forecast is not None:
            current = amounts[-1]
            growth_rate = ((forecast - current) / current * 100) if current else 0
            projections[service] = {
                "current_monthly": round(current * 30, 2),
                "forecast_90d": round(forecast, 2),
                "growth_rate_pct": round(growth_rate, 1),
            }
    return projections


def main():
    parser = argparse.ArgumentParser(description="GistPin cloud spend forecast")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--days", type=int, default=90, help="Historical days to analyse")
    parser.add_argument("--forecast-days", type=int, default=90, help="Days ahead to forecast")
    parser.add_argument("--budget", type=float, default=5000.0, help="Monthly budget in USD")
    parser.add_argument("--output", choices=["text", "json"], default="text")
    args = parser.parse_args()

    ce = boto3.client("ce", region_name=args.region)
    daily_data = fetch_cost_data(ce, days=args.days)
    projections = build_resource_growth(daily_data)

    total_current = sum(p["current_monthly"] for p in projections.values())
    total_forecast = sum(p["forecast_90d"] for p in projections.values())

    growth_pct = ((total_forecast - total_current) / total_current * 100) if total_current else 0

    savings = detect_savings(ce)

    results = {
        "total_current_monthly": round(total_current, 2),
        "total_forecast_90d": round(total_forecast, 2),
        "growth_rate_pct": round(growth_pct, 1),
        "budget_alerts": [],
        "resource_projections": projections,
        "savings_opportunities": savings,
    }

    if total_forecast > args.budget:
        overage = total_forecast - args.budget
        results["budget_alerts"].append({
            "severity": "critical",
            "message": f"Projected spend ${total_forecast:.0f} exceeds budget ${args.budget:.0f} by ${overage:.0f}",
        })
    elif total_forecast > args.budget * 0.85:
        results["budget_alerts"].append({
            "severity": "warning",
            "message": f"Projected spend ${total_forecast:.0f} is within 85% of budget ${args.budget:.0f}",
        })
    else:
        results["budget_alerts"].append({
            "severity": "info",
            "message": f"Projected spend ${total_forecast:.0f} is within budget ${args.budget:.0f}",
        })

    if args.output == "json":
        print(json.dumps(results, indent=2))
    else:
        print(f"\n=== GistPin Cloud Spend Forecast ({args.forecast_days}-day) ===\n")
        print(f"  Current monthly spend:  ${total_current:.2f}")
        print(f"  Forecast 90-day cost:   ${total_forecast:.2f}")
        print(f"  Growth rate:            {growth_pct:.1f}%\n")
        print("  Resource projections:")
        for svc, proj in sorted(projections.items(), key=lambda x: x[1]["current_monthly"], reverse=True):
            print(f"    {svc}: current=${proj['current_monthly']} → ${proj['forecast_90d']} ({proj['growth_rate_pct']}%)")
        print(f"\n  Budget alerts ({len(results['budget_alerts'])}):")
        for alert in results["budget_alerts"]:
            print(f"    [{alert['severity']}] {alert['message']}")
        print(f"\n  Savings opportunities ({len(savings)}):")
        for s in savings:
            print(f"    {s['resource']}: {s['savings']}")
        print()


if __name__ == "__main__":
    main()
