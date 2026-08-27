#!/usr/bin/env python3
"""
K8s Resource Utilization Forecasting Script (#1130)
Fetches CPU/memory metrics from kubectl top, computes a 7-day linear trend
forecast, and prints capacity recommendations with cost impact warnings.
"""

import subprocess
import sys
import json
from datetime import datetime, timedelta


def run_kubectl_top(namespace: str = "default") -> dict:
    """Fetch current CPU and memory utilization from kubectl top."""
    result = subprocess.run(
        ["kubectl", "top", "pods", "-n", namespace, "--no-headers"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERROR: kubectl top failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    metrics = {}
    for line in result.stdout.strip().splitlines():
        parts = line.split()
        if len(parts) >= 3:
            pod_name = parts[0]
            cpu = parts[1].rstrip("m")   # millicores
            mem = parts[2].rstrip("Mi")  # MiB
            metrics[pod_name] = {
                "cpu_millicores": int(cpu) if cpu.isdigit() else 0,
                "memory_mib": int(mem) if mem.isdigit() else 0,
            }
    return metrics


def linear_trend_forecast(history: list[float], days: int = 7) -> float:
    """
    Compute a simple linear regression forecast over historical data points.
    Returns the projected value `days` into the future.
    """
    n = len(history)
    if n < 2:
        return history[0] if history else 0.0

    x_mean = (n - 1) / 2.0
    y_mean = sum(history) / n

    numerator = sum((i - x_mean) * (history[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0.0
    intercept = y_mean - slope * x_mean

    forecast_x = n - 1 + days
    return intercept + slope * forecast_x


def simulate_history(current_value: float, num_points: int = 14) -> list[float]:
    """
    Simulate historical data points (replace with real Prometheus/metric query
    in production). Uses slight upward trend for demonstration.
    """
    import random
    history = []
    base = max(current_value - num_points * 0.5, 0)
    for i in range(num_points):
        val = base + i * 0.5 + random.uniform(-2, 2)
        history.append(max(0.0, val))
    history.append(current_value)
    return history


def print_recommendations(pod: str, cpu_forecast_pct: float, mem_forecast_pct: float):
    """Print capacity recommendations and cost warnings."""
    print(f"\n📊 Pod: {pod}")
    print(f"   7-day CPU forecast:    {cpu_forecast_pct:.1f}%")
    print(f"   7-day Memory forecast: {mem_forecast_pct:.1f}%")

    if cpu_forecast_pct > 80:
        print(f"   ⚠️  COST IMPACT WARNING: CPU forecast exceeds 80% — consider scaling up or optimizing workloads.")
        print(f"      Recommendation: Increase CPU requests/limits or add horizontal pod autoscaler (HPA).")

    if mem_forecast_pct > 80:
        print(f"   ⚠️  COST IMPACT WARNING: Memory forecast exceeds 80% — risk of OOMKilled pods.")
        print(f"      Recommendation: Increase memory limits or investigate memory leaks.")

    if cpu_forecast_pct <= 80 and mem_forecast_pct <= 80:
        print(f"   ✅ Resources within safe thresholds. No immediate action required.")


def main():
    namespace = sys.argv[1] if len(sys.argv) > 1 else "default"
    cpu_limit_millicores = int(sys.argv[2]) if len(sys.argv) > 2 else 1000  # 1 CPU
    mem_limit_mib = int(sys.argv[3]) if len(sys.argv) > 3 else 512

    print(f"🔍 Fetching K8s utilization metrics from namespace: {namespace}")
    print(f"   CPU limit: {cpu_limit_millicores}m | Memory limit: {mem_limit_mib}Mi")
    print(f"   Forecast horizon: 7 days")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z\n")

    metrics = run_kubectl_top(namespace)

    if not metrics:
        print("No pods found or no metrics available.")
        sys.exit(0)

    for pod, data in metrics.items():
        cpu_pct = (data["cpu_millicores"] / cpu_limit_millicores) * 100
        mem_pct = (data["memory_mib"] / mem_limit_mib) * 100

        cpu_history = simulate_history(cpu_pct)
        mem_history = simulate_history(mem_pct)

        cpu_forecast = linear_trend_forecast(cpu_history, days=7)
        mem_forecast = linear_trend_forecast(mem_history, days=7)

        cpu_forecast = min(max(cpu_forecast, 0), 150)  # cap at 150%
        mem_forecast = min(max(mem_forecast, 0), 150)

        print_recommendations(pod, cpu_forecast, mem_forecast)

    print("\n✅ Forecast complete. Review recommendations above.")


if __name__ == "__main__":
    main()
