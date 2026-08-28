#!/usr/bin/env python3
"""
Terraform Resource Graph Cycle Detector
Reads `terraform graph` DOT output from stdin, detects dependency cycles
using Kahn's topological sort algorithm, and exits with code 1 if any cycles
are found.

Usage:
    terraform graph | python infrastructure/scripts/detect-cycles.py
"""

import sys
import re
from collections import defaultdict, deque


def parse_dot(dot_input: str):
    """Parse DOT format output from `terraform graph` into an adjacency list."""
    adjacency = defaultdict(set)
    nodes = set()

    # Match edges: "NodeA" -> "NodeB"
    edge_pattern = re.compile(r'"([^"]+)"\s*->\s*"([^"]+)"')
    # Match standalone node declarations: "NodeA"
    node_pattern = re.compile(r'^\s*"([^"]+)"\s*(?:\[.*\])?\s*;?\s*$')

    for line in dot_input.splitlines():
        edge_match = edge_pattern.search(line)
        if edge_match:
            src, dst = edge_match.group(1), edge_match.group(2)
            adjacency[src].add(dst)
            nodes.add(src)
            nodes.add(dst)
        else:
            node_match = node_pattern.match(line)
            if node_match:
                nodes.add(node_match.group(1))

    # Ensure every node appears in the adjacency list (even if no outgoing edges)
    for node in nodes:
        if node not in adjacency:
            adjacency[node] = set()

    return adjacency, nodes


def detect_cycles_kahn(adjacency: dict, nodes: set):
    """
    Kahn's topological sort: if not all nodes are processed, a cycle exists.
    Returns a list of nodes involved in cycles.
    """
    in_degree = {node: 0 for node in nodes}
    for src in adjacency:
        for dst in adjacency[src]:
            in_degree[dst] = in_degree.get(dst, 0) + 1

    queue = deque(node for node in nodes if in_degree[node] == 0)
    processed = set()

    while queue:
        node = queue.popleft()
        processed.add(node)
        for neighbor in adjacency.get(node, set()):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    cycle_nodes = nodes - processed
    return list(cycle_nodes)


def find_cycles_dfs(adjacency: dict, nodes: set):
    """
    DFS-based cycle detection that reconstructs actual cycle paths.
    Returns a list of cycles, each cycle is a list of node names.
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in nodes}
    parent = {node: None for node in nodes}
    cycles = []

    def dfs(node):
        color[node] = GRAY
        for neighbor in adjacency.get(node, set()):
            if color[neighbor] == GRAY:
                # Reconstruct cycle
                cycle = [neighbor]
                cur = node
                while cur != neighbor:
                    cycle.append(cur)
                    cur = parent[cur]
                cycle.append(neighbor)
                cycle.reverse()
                cycles.append(cycle)
            elif color[neighbor] == WHITE:
                parent[neighbor] = node
                dfs(neighbor)
        color[node] = BLACK

    for node in nodes:
        if color[node] == WHITE:
            dfs(node)

    return cycles


def main():
    dot_input = sys.stdin.read()

    if not dot_input.strip():
        print("ERROR: No input received. Pipe `terraform graph` output to this script.", file=sys.stderr)
        sys.exit(2)

    adjacency, nodes = parse_dot(dot_input)

    if not nodes:
        print("WARNING: No nodes found in graph. Verify that input is valid DOT format.", file=sys.stderr)
        sys.exit(0)

    print(f"Analyzing dependency graph: {len(nodes)} nodes, "
          f"{sum(len(v) for v in adjacency.values())} edges")

    # Use Kahn's algorithm to quickly identify if cycles exist
    cycle_nodes = detect_cycles_kahn(adjacency, nodes)

    if not cycle_nodes:
        print("✅  No dependency cycles detected.")
        sys.exit(0)

    # Use DFS to reconstruct actual cycle paths for reporting
    cycles = find_cycles_dfs(adjacency, nodes)

    print(f"\n❌  CYCLE DETECTED: {len(cycles)} cycle(s) found involving "
          f"{len(cycle_nodes)} node(s).\n", file=sys.stderr)

    for i, cycle in enumerate(cycles, 1):
        print(f"  Cycle {i}: {' -> '.join(cycle)}", file=sys.stderr)

    print(f"\nNodes involved in cycles:", file=sys.stderr)
    for node in sorted(cycle_nodes):
        print(f"  - {node}", file=sys.stderr)

    print("\nFix these cyclic dependencies before applying the Terraform configuration.",
          file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
