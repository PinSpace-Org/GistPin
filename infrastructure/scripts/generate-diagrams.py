#!/usr/bin/env python3
"""Generate network and architecture diagrams from infrastructure manifests."""

import os
import sys
import glob
import json
from pathlib import Path

OUTPUT_DIR = Path("infrastructure/docs/auto-generated")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def parse_k8s_services(k8s_dir: str) -> list[dict]:
    """Extract service/deployment info from K8s YAML files."""
    services = []
    try:
        import yaml  # type: ignore
        for f in glob.glob(f"{k8s_dir}/*.yaml"):
            with open(f) as fh:
                docs = list(yaml.safe_load_all(fh))
            for doc in docs:
                if not doc:
                    continue
                kind = doc.get("kind", "")
                name = doc.get("metadata", {}).get("name", "unknown")
                if kind in ("Service", "Deployment", "StatefulSet"):
                    services.append({"kind": kind, "name": name, "file": os.path.basename(f)})
    except ImportError:
        # Fallback: simple grep-style parsing
        for f in glob.glob(f"{k8s_dir}/*.yaml"):
            kind, name = "", ""
            with open(f) as fh:
                for line in fh:
                    if line.startswith("kind:"):
                        kind = line.split(":", 1)[1].strip()
                    if line.strip().startswith("name:") and not name:
                        name = line.split(":", 1)[1].strip()
            if kind in ("Service", "Deployment", "StatefulSet"):
                services.append({"kind": kind, "name": name, "file": os.path.basename(f)})
    return services


def generate_mermaid_network(services: list[dict]) -> str:
    """Produce a Mermaid network diagram."""
    lines = ["```mermaid", "graph LR"]
    deployments = [s for s in services if s["kind"] == "Deployment"]
    svcs = [s for s in services if s["kind"] == "Service"]
    stateful = [s for s in services if s["kind"] == "StatefulSet"]

    lines.append("  Internet([Internet]) --> Ingress[Ingress Controller]")
    for d in deployments:
        node_id = d["name"].replace("-", "_")
        lines.append(f"  Ingress --> {node_id}[{d['name']}]")
    for s in stateful:
        node_id = s["name"].replace("-", "_")
        lines.append(f"  {node_id}[(Database: {s['name']})]")
    for svc in svcs:
        node_id = svc["name"].replace("-", "_")
        lines.append(f"  {node_id}_svc{{Service: {svc['name']}}}")

    lines.append("```")
    return "\n".join(lines)


def generate_mermaid_dependency(tf_dir: str) -> str:
    """Produce a simple Terraform dependency diagram."""
    resources = []
    for f in glob.glob(f"{tf_dir}/*.tf"):
        with open(f) as fh:
            for line in fh:
                line = line.strip()
                if line.startswith("resource "):
                    parts = line.split('"')
                    if len(parts) >= 4:
                        resources.append(f"{parts[1]}.{parts[3]}")

    lines = ["```mermaid", "graph TD"]
    for r in resources[:20]:  # cap at 20 for readability
        node = r.replace(".", "_").replace("-", "_")
        lines.append(f"  {node}[{r}]")
    lines.append("```")
    return "\n".join(lines)


def main():
    k8s_dir = "infrastructure/k8s"
    tf_dir = "infrastructure/terraform"

    services = parse_k8s_services(k8s_dir)

    network_diagram = generate_mermaid_network(services)
    dep_diagram = generate_mermaid_dependency(tf_dir)

    out = OUTPUT_DIR / "network-diagram.md"
    out.write_text(
        f"# Network Diagram\n\nGenerated: {__import__('datetime').datetime.utcnow().isoformat()}Z\n\n"
        + network_diagram + "\n"
    )
    print(f"Written: {out}")

    out2 = OUTPUT_DIR / "terraform-dependency-graph.md"
    out2.write_text(
        f"# Terraform Dependency Graph\n\nGenerated: {__import__('datetime').datetime.utcnow().isoformat()}Z\n\n"
        + dep_diagram + "\n"
    )
    print(f"Written: {out2}")

    print("Diagram generation complete.")


if __name__ == "__main__":
    main()
