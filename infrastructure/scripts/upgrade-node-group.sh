#!/bin/bash
set -euo pipefail

# EKS Node Group Rolling Upgrade Script
# Usage: ./upgrade-node-group.sh <cluster-name> <node-group-name> <target-version> [--rollback]

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

UPGRADE_START_TIME=""
ORIGINAL_NODE_GROUP_VERSION=""
UPGRADE_IN_PROGRESS=false
NODE_GROUP_ARN=""
ROLLBACK_MODE=false

log() {
    echo -e "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

error() {
    log "${RED}ERROR: $1${NC}" >&2
    if [ "$UPGRADE_IN_PROGRESS" = true ]; then
        log "${YELLOW}An error occurred during upgrade. Run with --rollback to initiate rollback procedure.${NC}"
    fi
    exit 1
}

warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Function to perform rollback
perform_rollback() {
    log "Initiating rollback procedure..."
    
    if [ -z "$ORIGINAL_NODE_GROUP_VERSION" ]; then
        error "Original version not found, cannot rollback safely"
    fi
    
    log "Rolling back node group $NODE_GROUP_NAME from current version to original version $ORIGINAL_NODE_GROUP_VERSION"
    
    # Update node group to original version
    aws eks update-nodegroup-version \
        --cluster-name "$CLUSTER_NAME" \
        --nodegroup-name "$NODE_GROUP_NAME" \
        --version "$ORIGINAL_NODE_GROUP_VERSION"
    
    log "Waiting for rollback to complete..."
    aws eks wait nodegroup-active --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME"
    
    # Verify all nodes are rolled back
    local nodes
    nodes=$(kubectl get nodes -o json | jq -r '.items[] | select(.metadata.labels."eks.amazonaws.com/nodegroup"=="'"$NODE_GROUP_NAME"'") | .metadata.name')
    
    for node in $nodes; do
        local node_version
        node_version=$(kubectl get node "$node" -o json | jq -r '.status.nodeInfo.kubeletVersion' | sed 's/v//')
        if [ "$node_version" != "$ORIGINAL_NODE_GROUP_VERSION" ]; then
            warn "Node $node still on version $node_version, expected $ORIGINAL_NODE_GROUP_VERSION"
        else
            success "Node $node successfully rolled back to $node_version"
        fi
    done
    
    success "Rollback completed successfully"
    UPGRADE_IN_PROGRESS=false
    exit 0
}

# Cordon a node - mark it as unschedulable
cordon_node() {
    local node_name="$1"
    log "Cordoning node $node_name..."
    kubectl cordon "$node_name"
    success "Node $node_name cordoned successfully"
}

# Drain a node - evict all pods from it
drain_node() {
    local node_name="$1"
    log "Draining node $node_name..."
    # Wait 5 minutes for pod eviction, ignore daemonsets, force deletion
    kubectl drain "$node_name" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --force \
        --timeout=300s
    success "Node $node_name drained successfully"
}

# Uncordon a node - mark it as schedulable again
uncordon_node() {
    local node_name="$1"
    log "Uncordoning node $node_name..."
    kubectl uncordon "$node_name"
    success "Node $node_name uncordoned successfully"
}

# Get all nodes in the node group
get_node_group_nodes() {
    kubectl get nodes -o json | jq -r '.items[] | select(.metadata.labels."eks.amazonaws.com/nodegroup"=="'"$NODE_GROUP_NAME"'") | .metadata.name'
}

# Wait for new nodes to join and become ready
wait_for_new_nodes() {
    local expected_count="$1"
    log "Waiting for $expected_count new nodes to join cluster and become ready..."
    
    local max_attempts=60 # 30 minutes total (30s per attempt)
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local ready_nodes
        ready_nodes=$(kubectl get nodes -o json | jq -r '.items[] | select(.metadata.labels."eks.amazonaws.com/nodegroup"=="'"$NODE_GROUP_NAME"'" and .status.conditions[] | select(.type=="Ready" and .status=="True")) | .metadata.name' | wc -l)
        
        if [ "$ready_nodes" -ge "$expected_count" ]; then
            success "All $expected_count nodes are ready"
            return 0
        fi
        
        log "Ready nodes: $ready_nodes/$expected_count. Waiting 30s..."
        sleep 30
        ((attempt++))
    done
    
    error "Timed out waiting for new nodes to become ready"
}

# Validate upgrade after completion
validate_upgrade() {
    log "Starting post-upgrade validation..."
    
    # Check all nodes in node group are on target version
    local nodes
    nodes=$(get_node_group_nodes)
    local all_valid=true
    
    for node in $nodes; do
        local node_version
        node_version=$(kubectl get node "$node" -o json | jq -r '.status.nodeInfo.kubeletVersion' | sed 's/v//')
        if [ "$node_version" != "$TARGET_VERSION" ]; then
            error "Node $node is on version $node_version, expected $TARGET_VERSION"
            all_valid=false
        else
            success "Node $node is running target version $TARGET_VERSION"
        fi
    done
    
    # Check all pods are running
    local non_running_pods
    non_running_pods=$(kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.status.phase!="Running" and .status.phase!="Succeeded") | .metadata.namespace+"/"+.metadata.name')
    
    if [ -n "$non_running_pods" ]; then
        warn "Found non-running pods after upgrade: $non_running_pods"
    else
        success "All pods are in Running/Succeeded state"
    fi
    
    # Check all nodes are Ready
    local not_ready_nodes
    not_ready_nodes=$(kubectl get nodes -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name')
    
    if [ -n "$not_ready_nodes" ]; then
        error "Found nodes in NotReady state after upgrade: $not_ready_nodes"
    else
        success "All nodes are in Ready state"
    fi
    
    # Verify node group status is ACTIVE
    local nodegroup_status
    nodegroup_status=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.status')
    
    if [ "$nodegroup_status" != "ACTIVE" ]; then
        error "Node group is in $nodegroup_status state after upgrade, expected ACTIVE"
    else
        success "Node group is ACTIVE"
    fi
    
    if [ "$all_valid" = true ]; then
        success "All post-upgrade validations passed!"
    fi
}

# Perform rolling upgrade of nodes
perform_rolling_upgrade() {
    log "Starting rolling upgrade process..."
    UPGRADE_IN_PROGRESS=true
    
    # Get list of current nodes before upgrade starts
    local old_nodes
    old_nodes=$(get_node_group_nodes)
    local old_node_count=$(echo "$old_nodes" | wc -l | xargs)
    log "Found $old_node_count existing nodes in node group"
    
    # Store original node group version
    ORIGINAL_NODE_GROUP_VERSION=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.version')
    NODE_GROUP_ARN=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.arn')
    
    log "Original version: $ORIGINAL_NODE_GROUP_VERSION, Target version: $TARGET_VERSION"
    
    # Initiate node group version update
    log "Initiating node group version update in EKS..."
    aws eks update-nodegroup-version \
        --cluster-name "$CLUSTER_NAME" \
        --nodegroup-name "$NODE_GROUP_NAME" \
        --version "$TARGET_VERSION"
    
    # Wait for node group to start provisioning new nodes
    log "Waiting for EKS to provision new nodes..."
    sleep 60 # Initial wait for AWS to start the update
    
    # Wait for new nodes to join
    wait_for_new_nodes $((old_node_count + 1)) # Wait for at least one new node
    
    # Process old nodes one by one
    for node in $old_nodes; do
        echo "----------------------------------------"
        log "Processing old node: $node"
        
        # Check if node still exists
        if kubectl get node "$node" &> /dev/null; then
            # Cordon and drain the old node
            cordon_node "$node"
            drain_node "$node"
            
            # Wait a bit to ensure workloads are rescheduled
            log "Waiting 60s for workloads to stabilize on new nodes..."
            sleep 60
            
            # Verify node is no longer needed (new nodes are handling workload)
            success "Node $node successfully drained and can be terminated"
        else
            warn "Node $node no longer exists in cluster, skipping"
        fi
    done
    
    # Wait for all old nodes to be terminated and all new nodes ready
    log "Waiting for all nodes to reach ready state..."
    wait_for_new_nodes $old_node_count
    
    # All new nodes should be ready and uncordoned by default, but verify
    local new_nodes
    new_nodes=$(get_node_group_nodes)
    for node in $new_nodes; do
        # Check if node is cordoned, if so uncordon it
        if kubectl get node "$node" -o json | jq -r '.spec.unschedulable' | grep -q true; then
            uncordon_node "$node"
        fi
    done
    
    echo "----------------------------------------"
    success "Node group upgrade completed successfully!"
    
    # Run post-upgrade validation
    validate_upgrade
    
    UPGRADE_IN_PROGRESS=false
}

# Main execution
main() {
    # Parse arguments
    if [ "$#" -lt 3 ]; then
        error "Usage: $0 <cluster-name> <node-group-name> <target-version> [--rollback]"
    fi
    
    CLUSTER_NAME="$1"
    NODE_GROUP_NAME="$2"
    TARGET_VERSION="$3"
    
    if [ "$#" -eq 4 ] && [ "$4" = "--rollback" ]; then
        ROLLBACK_MODE=true
        log "Running in rollback mode..."
        # Update kubeconfig
        aws eks update-kubeconfig --name "$CLUSTER_NAME"
        perform_rollback
        exit 0
    fi
    
    log "Starting node group upgrade process for $NODE_GROUP_NAME in cluster $CLUSTER_NAME"
    log "Target Kubernetes version: $TARGET_VERSION"
    echo "----------------------------------------"
    
    # First run pre-upgrade checks
    log "Running pre-upgrade checks..."
    if ! ./pre-upgrade-checks.sh "$CLUSTER_NAME" "$NODE_GROUP_NAME" "$TARGET_VERSION"; then
        error "Pre-upgrade checks failed, aborting upgrade"
    fi
    echo "----------------------------------------"
    
    # Update kubeconfig
    aws eks update-kubeconfig --name "$CLUSTER_NAME"
    
    # Proceed with rolling upgrade
    perform_rolling_upgrade
    
    echo "----------------------------------------"
    success "Upgrade process fully completed!"
}

main "$@"