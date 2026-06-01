#!/usr/bin/env python3
"""GistPin usage forecasting — linear trend projection from CloudWatch metrics."""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone

try:
    import boto3
except ImportError:
    print("boto3 required: pip install boto3", file=sys.stderr)
    sys.exit(1)

METRICS = [
    ("ContainerInsights", "node_cpu_utilization", [{"Name": "ClusterName", "Value": "gistpin"}]),
    ("ContainerInsights", "node_memory_utilization", [{"Name": "ClusterName", "Value": "gistpin"}]),
    ("AWS/RDS", "DatabaseConnections", [{"Name": "DBInstanceIdentifier", "Value": "gistpin-db"}]),
    ("AWS/RDS", "FreeStorageSpace", [{"Name": "DBInstanceIdentifier", "Value": "gistpin-db"}]),
]


def fetch_metric(cw, namespace, metric, dimensions, days=30):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    resp = cw.get_metric_statistics(
        Namespace=namespace,
        MetricName=metric,
        Dimensions=dimensions,
        StartTime=start,
        EndTime=end,
        Period=86400,
        Statistics=["Average"],
    )
    points = sorted(resp["Datapoints"], key=lambda d: d["Timestamp"])
    return [p["Average"] for p in points]


def linear_forecast(values, forecast_days=90):
    """Simple linear regression forecast."""
    n = len(values)
    if n < 2:
        return None
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    slope = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values)) / \
            sum((i - x_mean) ** 2 for i in range(n))
    intercept = y_mean - slope * x_mean
    return intercept + slope * (n - 1 + forecast_days)


def recommend(metric_name, current, forecast):
    if forecast is None:
        return "Insufficient data"
    growth = ((forecast - current) / current * 100) if current else 0
    if "cpu" in metric_name.lower() or "memory" in metric_name.lower():
        if forecast > 80:
            return f"SCALE UP — projected {forecast:.1f}% utilization (+{growth:.0f}%)"
        if forecast < 30:
            return f"SCALE DOWN — projected {forecast:.1f}% utilization ({growth:.0f}%)"
        return f"OK — projected {forecast:.1f}% utilization"
    if "storage" in metric_name.lower():
        gb = forecast / (1024 ** 3)
        return f"Free storage projected: {gb:.1f} GB — {'ADD STORAGE' if gb < 20 else 'OK'}"
    return f"Projected value: {forecast:.1f} (current: {current:.1f}, +{growth:.0f}%)"


def main():
    parser = argparse.ArgumentParser(description="GistPin usage forecast")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--days", type=int, default=30, help="Historical days to analyse")
    parser.add_argument("--forecast-days", type=int, default=90, help="Days to forecast ahead")
    parser.add_argument("--output", choices=["text", "json"], default="text")
    args = parser.parse_args()

    cw = boto3.client("cloudwatch", region_name=args.region)
    results = []

    for namespace, metric, dimensions in METRICS:
        values = fetch_metric(cw, namespace, metric, dimensions, args.days)
        current = values[-1] if values else 0
        forecast = linear_forecast(values, args.forecast_days)
        recommendation = recommend(metric, current, forecast)
        results.append({
            "metric": metric,
            "current": round(current, 2),
            "forecast_90d": round(forecast, 2) if forecast else None,
            "recommendation": recommendation,
        })

    if args.output == "json":
        print(json.dumps(results, indent=2))
    else:
        print(f"\n=== GistPin Usage Forecast ({args.forecast_days}-day projection) ===\n")
        for r in results:
            print(f"  {r['metric']}")
            print(f"    Current:     {r['current']}")
            print(f"    Forecast:    {r['forecast_90d']}")
            print(f"    Recommendation: {r['recommendation']}\n")


if __name__ == "__main__":
    main()
