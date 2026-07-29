# Terraform Dependency Optimization

## Overview
Analyze and optimize Terraform resource dependency graphs to improve plan/apply performance.

## Usage
```bash
python3 infrastructure/scripts/analyze-tf-graph.py
```

## Best Practices
- Minimize chained dependencies to enable parallel resource creation
- Use `depends_on` sparingly — prefer implicit references
- Break large modules into smaller independent units
- Run analysis on every PR via CI
