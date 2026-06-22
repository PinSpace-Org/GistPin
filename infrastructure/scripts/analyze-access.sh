#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

INPUT_FILE=""
OUTPUT_FILE="${OUTPUT_FILE:-}"
BUCKET_NAME="${BUCKET_NAME:-gistpin-backups}"
RESTORE_KEY="${RESTORE_KEY:-}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports/storage-tiering}"

usage() {
  cat <<'EOF'
Usage: analyze-access.sh [--input FILE] [--output FILE] [--bucket NAME] [--restore-key KEY]

Reads a JSON inventory of S3 objects and produces a storage-tiering report.
If no input is provided, the script writes an empty report and exits cleanly.

Expected JSON shape:
[
  {
    "key": "backups/2026-06-01.sql.gz",
    "bucket": "gistpin-backups",
    "storage_class": "STANDARD",
    "size_bytes": 12345,
    "last_accessed_days": 42,
    "request_count_30d": 8
  }
]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      INPUT_FILE="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    --bucket)
      BUCKET_NAME="${2:-}"
      shift 2
      ;;
    --restore-key)
      RESTORE_KEY="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${OUTPUT_FILE}" ]]; then
  TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  OUTPUT_FILE="${REPORT_DIR}/storage-tiering-${TIMESTAMP}.json"
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run access analysis." >&2
  exit 1
fi

python3 - "${INPUT_FILE}" "${OUTPUT_FILE}" "${BUCKET_NAME}" "${RESTORE_KEY}" <<'PY'
from __future__ import annotations

import json
import pathlib
import shlex
import sys
from datetime import datetime, timezone

input_file, output_file, default_bucket, restore_key = sys.argv[1:5]

WEIGHTS = {
    "STANDARD": 1.0,
    "STANDARD_IA": 0.7,
    "GLACIER_IR": 0.25,
    "DEEP_ARCHIVE": 0.05,
}

DEFAULT_LIFECYCLE_RECOMMENDATION = [
    {"days": 30, "storage_class": "STANDARD_IA"},
    {"days": 90, "storage_class": "GLACIER_IR"},
    {"days": 180, "storage_class": "DEEP_ARCHIVE"},
]


def to_int(value: object, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def first_present(*values: object, default: object = "") -> object:
    for value in values:
        if value not in (None, ""):
            return value
    return default


def classify(days: int, requests: int) -> tuple[str, str, str]:
    if requests >= 100 or days <= 7:
        return "hot", "STANDARD", "frequently accessed"
    if days <= 30 or requests >= 20:
        return "warm", "STANDARD_IA", "moderate access frequency"
    if days <= 90 or requests >= 1:
        return "cold", "GLACIER_IR", "infrequent access"
    return "archive", "DEEP_ARCHIVE", "cold archive candidate"


def weight(storage_class: str) -> float:
    return WEIGHTS.get(storage_class.upper(), 1.0)


def load_inventory() -> list[dict[str, object]]:
    raw = ""
    input_path = pathlib.Path(input_file) if input_file else None

    if input_path and input_path.exists():
        raw = input_path.read_text()
    elif not sys.stdin.isatty():
        raw = sys.stdin.read()

    if not raw.strip():
        return []

    payload = json.loads(raw)
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("objects", "items", "records", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def normalize(inventory: list[dict[str, object]]) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []
    for entry in inventory:
        key = str(
            first_present(
                entry.get("key"),
                entry.get("Key"),
                entry.get("object_key"),
                entry.get("name"),
                default="",
            )
        )
        if not key:
            continue

        bucket = str(
            first_present(entry.get("bucket"), entry.get("Bucket"), default=default_bucket)
        )
        storage_class = str(first_present(entry.get("storage_class"), entry.get("StorageClass"), default="STANDARD")).upper()
        size_bytes = to_int(first_present(entry.get("size_bytes"), entry.get("Size"), entry.get("size"), default=0))
        last_accessed_days = to_int(
            first_present(
                entry.get("last_accessed_days"),
                entry.get("days_since_last_access"),
                entry.get("age_days"),
                default=0,
            )
        )
        request_count_30d = to_int(
            first_present(
                entry.get("request_count_30d"),
                entry.get("requests_30d"),
                entry.get("access_count_30d"),
                default=0,
            )
        )

        tier, recommended_storage_class, reason = classify(last_accessed_days, request_count_30d)
        current_weight = weight(storage_class)
        recommended_weight = weight(recommended_storage_class)

        restore_command = None
        if recommended_storage_class in {"GLACIER_IR", "DEEP_ARCHIVE"}:
            restore_request = json.dumps(
                {"Days": 7, "GlacierJobParameters": {"Tier": "Standard"}},
                separators=(",", ":"),
            )
            restore_command = (
                f"aws s3api restore-object --bucket {shlex.quote(bucket)} "
                f"--key {shlex.quote(key)} --restore-request {shlex.quote(restore_request)}"
            )

        normalized.append(
            {
                "bucket": bucket,
                "key": key,
                "storage_class": storage_class,
                "size_bytes": size_bytes,
                "last_accessed_days": last_accessed_days,
                "request_count_30d": request_count_30d,
                "tier": tier,
                "recommended_storage_class": recommended_storage_class,
                "reason": reason,
                "storage_class_changed": storage_class != recommended_storage_class,
                "current_relative_cost_units": round(size_bytes * current_weight, 2),
                "optimized_relative_cost_units": round(size_bytes * recommended_weight, 2),
                "restore_command": restore_command,
            }
        )
    return normalized


def summarize(objects: list[dict[str, object]]) -> dict[str, object]:
    summary = {
        "objects": len(objects),
        "bytes": 0,
        "current_relative_cost_units": 0.0,
        "optimized_relative_cost_units": 0.0,
    }
    tier_breakdown = {
        "hot": {"objects": 0, "bytes": 0},
        "warm": {"objects": 0, "bytes": 0},
        "cold": {"objects": 0, "bytes": 0},
        "archive": {"objects": 0, "bytes": 0},
    }
    recommendations = []
    restore_candidates = []

    for obj in objects:
        summary["bytes"] += obj["size_bytes"]
        summary["current_relative_cost_units"] += obj["current_relative_cost_units"]
        summary["optimized_relative_cost_units"] += obj["optimized_relative_cost_units"]

        tier_breakdown[obj["tier"]]["objects"] += 1
        tier_breakdown[obj["tier"]]["bytes"] += obj["size_bytes"]

        if obj["storage_class_changed"]:
            recommendations.append(
                {
                    "bucket": obj["bucket"],
                    "key": obj["key"],
                    "current_storage_class": obj["storage_class"],
                    "recommended_storage_class": obj["recommended_storage_class"],
                    "reason": obj["reason"],
                }
            )

        if obj["restore_command"]:
            restore_candidates.append(
                {
                    "bucket": obj["bucket"],
                    "key": obj["key"],
                    "recommended_storage_class": obj["recommended_storage_class"],
                    "restore_command": obj["restore_command"],
                }
            )

    savings = 0.0
    if summary["current_relative_cost_units"] > 0:
        savings = round(
            (1 - summary["optimized_relative_cost_units"] / summary["current_relative_cost_units"]) * 100,
            2,
        )

    lifecycle_recommendation = DEFAULT_LIFECYCLE_RECOMMENDATION
    if restore_key:
        restore_candidates = [item for item in restore_candidates if item["key"] == restore_key]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": input_file or "stdin",
        "bucket": default_bucket,
        "summary": {
            **summary,
            "estimated_savings_percent": savings,
        },
        "tier_breakdown": tier_breakdown,
        "recommendations": recommendations,
        "restore_candidates": restore_candidates,
        "lifecycle_recommendation": lifecycle_recommendation,
    }


report = summarize(normalize(load_inventory()))
pathlib.Path(output_file).write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
print(json.dumps({
    "report_file": output_file,
    "objects": report["summary"]["objects"],
    "estimated_savings_percent": report["summary"]["estimated_savings_percent"],
    "restore_candidates": len(report["restore_candidates"]),
}, sort_keys=True))
PY
