#!/usr/bin/env python3
"""Analyze Terraform resource dependency graphs."""
import json, sys, subprocess
from collections import defaultdict

def get_graph():
    result = subprocess.run(
        ["terraform", "graph", "-type=plan"],
        capture_output=True, text=True, cwd="infrastructure/terraform"
    )
    return result.stdout

def parse_dot(dot):
    deps = defaultdict(set)
    for line in dot.splitlines():
        if "->" in line:
            parts = line.split("->")
            if len(parts) == 2:
                src = parts[0].strip().strip('"')
                dst = parts[1].strip().strip('"').rstrip(";").strip()
                deps[src].add(dst)
    return deps

def find_circular(deps):
    visited = set()
    path = []
    def dfs(node):
        if node in path:
            cycle = path[path.index(node):]
            return cycle + [node]
        if node in visited:
            return None
        visited.add(node)
        path.append(node)
        for neighbor in deps.get(node, set()):
            result = dfs(neighbor)
            if result:
                return result
        path.pop()
        return None
    for node in list(deps.keys()):
        result = dfs(node)
        if result:
            print(f"Circular dependency: {' -> '.join(result)}")

def find_orphans(deps):
    all_resources = set(deps.keys()) | {d for v in deps.values() for d in v}
    referenced = {d for v in deps.values() for d in v}
    orphans = all_resources - referenced
    for o in sorted(orphans):
        print(f"Orphaned resource: {o}")

def suggest_parallelism(deps):
    chains = []
    for node in deps:
        chain = [node]
        while chain[-1] in deps:
            nxt = list(deps[chain[-1]])
            if len(nxt) == 1:
                chain.append(nxt[0])
            else:
                break
        if len(chain) > 1:
            chains.append(chain)
    chains.sort(key=len, reverse=True)
    for chain in chains[:5]:
        print(f"Parallelization opportunity: {' -> '.join(chain)}")

if __name__ == "__main__":
    dot = get_graph()
    deps = parse_dot(dot)
    print("=== Dependency Graph Analysis ===")
    print(f"Total resources in graph: {len(deps)}")
    print()
    find_circular(deps)
    print()
    find_orphans(deps)
    print()
    suggest_parallelism(deps)
