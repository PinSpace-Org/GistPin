import os
import json

def monitor_state_size(state_file_path: str, max_size_mb: float = 50.0):
    """Checks Terraform state file sizes to prevent unbounded state growth."""
    if not os.path.exists(state_file_path):
        return
    size_mb = os.path.getsize(state_file_path) / (1024 * 1024)
    if size_mb > max_size_mb:
        print(f"WARNING: Terraform state file exceeds limit: {size_mb:.2f}MB")
    else:
        print(f"Terraform state file size is healthy: {size_mb:.2f}MB")
