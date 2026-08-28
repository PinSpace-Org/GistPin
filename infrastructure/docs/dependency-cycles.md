# Terraform Dependency Cycle Detector

## Overview

The cycle detector analyzes the output of `terraform graph` to identify circular
dependencies in your Terraform resource configuration before they cause `terraform apply`
failures or unpredictable plan behavior.

## How It Works

1. **Graph generation** – `terraform graph` emits a [DOT-format](https://graphviz.org/doc/info/lang.html)
   directed graph representing all resource dependencies.
2. **Parsing** – `detect-cycles.py` reads the DOT output from stdin, extracting nodes
   and directed edges into an adjacency list.
3. **Kahn's algorithm** – A topological sort is attempted. If any nodes remain unprocessed
   after the sort completes, those nodes are part of a cycle.
4. **DFS reconstruction** – A depth-first search traces the exact cycle path so you know
   which resources are involved.
5. **Exit code** – The script exits `0` when no cycles are found and `1` when cycles are
   detected, making it suitable for CI gating.

## Usage

### Local

```bash
cd infrastructure/terraform
terraform init -backend=false
terraform graph | python ../scripts/detect-cycles.py
```

### CI/CD

The workflow in `infrastructure/ci/cycle-detection.yml` runs automatically on every push
or pull request that modifies Terraform files. A failed check blocks the PR merge.

## Interpreting Output

**No cycles found:**
```
Analyzing dependency graph: 42 nodes, 67 edges
✅  No dependency cycles detected.
```

**Cycle detected:**
```
Analyzing dependency graph: 42 nodes, 68 edges

❌  CYCLE DETECTED: 1 cycle(s) found involving 3 node(s).

  Cycle 1: aws_security_group.app -> aws_security_group.db -> aws_security_group.app

Nodes involved in cycles:
  - aws_security_group.app
  - aws_security_group.db
```

## Fixing Cycles

Common causes and fixes:

| Cause | Fix |
|-------|-----|
| Cross-referencing security groups | Use `aws_security_group_rule` resources instead of inline rules |
| Module output fed back as input | Introduce an intermediate data source or locals block |
| Circular `depends_on` declarations | Remove unnecessary `depends_on`; rely on implicit references |
