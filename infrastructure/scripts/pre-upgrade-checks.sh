#!/bin/bash
set -euo pipefail

# EKS Node Group Pre-Upgrade Checks
# Usage: ./pre-upgrade-checks.sh <cluster-name> <node-group-name> <target-version>

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

error() {
    log "${RED}ERROR: $1${NC}" >&2
    exit 1
}

warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Check required arguments
if [ "$#" -ne 3 ]; then
    error "Usage: $0 <cluster-name> <node-group-name> <target-version>"
fi

CLUSTER_NAME="$1"
NODE_GROUP_NAME="$2"
TARGET_VERSION="$3"

# Check if required tools are installed
check_dependencies() {
    log "Checking required dependencies..."
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
    fi
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is not installed"
    fi
    
    success "All dependencies are installed"
}

# Verify cluster exists
check_cluster_exists() {
    log "Checking if cluster $CLUSTER_NAME exists..."
    
    if ! aws eks describe-cluster --name "$CLUSTER_NAME" &> /dev/null; then
        error "Cluster $CLUSTER_NAME does not exist or you don't have access to it"
    fi
    
    success "Cluster $CLUSTER_NAME found"
}

# Verify node group exists and get current version
check_node_group_exists() {
    log "Checking if node group $NODE_GROUP_NAME exists..."
    
    local node_group_info
    node_group_info=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" 2>/dev/null || error "Node group $NODE_GROUP_NAME not found in cluster $CLUSTER_NAME")
    
    CURRENT_VERSION=$(echo "$node_group_info" | jq -r '.nodegroup.version')
    log "Current node group version: $CURRENT_VERSION"
    log "Target version: $TARGET_VERSION"
    
    # Validate version order
    if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
        error "Node group is already on version $TARGET_VERSION"
    fi
    
    # Check if upgrade is allowed (only one minor version jump at a time in EKS)
    local current_minor=$(echo "$CURRENT_VERSION" | cut -d. -f2)
    local target_minor=$(echo "$TARGET_VERSION" | cut -d. -f2)
    
    if [ $((target_minor - current_minor)) -gt 1 ]; then
        error "Cannot upgrade from $CURRENT_VERSION to $TARGET_VERSION. Only one minor version jump is allowed."
    fi
    
    success "Node group $NODE_GROUP_NAME is eligible for upgrade"
}

# Check cluster version compatibility
check_cluster_version_compatibility() {
    log "Checking cluster version compatibility..."
    
    local cluster_version
    cluster_version=$(aws eks describe-cluster --name "$CLUSTER_NAME" | jq -r '.cluster.version')
    
    if [ "$(echo "$TARGET_VERSION" | cut -d. -f1-2)" != "$cluster_version" ]; then
        error "Target version $TARGET_VERSION does not match cluster version $cluster_version. Node group version must match cluster version."
    fi
    
    success "Target version matches cluster version"
}

# Check cluster health
check_cluster_health() {
    log "Checking overall cluster health..."
    
    # Update kubeconfig
    aws eks update-kubeconfig --name "$CLUSTER_NAME"
    
    # Check if all nodes are ready
    local not_ready_nodes
    not_ready_nodes=$(kubectl get nodes -o json | jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name')
    
    if [ -n "$not_ready_nodes" ]; then
        error "Found nodes in NotReady state: $not_ready_nodes"
    fi
    
    success "All nodes are in Ready state"
    
    # Check for any PodDisruptionBudgets that might block draining
    local pdb_violations
    pdb_violations=$(kubectl get poddisruptionbudgets --all-namespaces -o json | jq -r '.items[] | select(.status.disruptionsAllowed == 0) | .metadata.namespace + "/" + .metadata.name')
    
    if [ -n "$pdb_violations" ]; then
        warn "Found PDBs with 0 disruptions allowed: $pdb_violations. These may block node draining."
    else
        success "No PDBs that would block node draining found"
    fi
    
    # Check for critical pods that might be affected
    local kube_system_pods
    kube_system_pods=$(kubectl get pods -n kube-system -o json | jq -r '.items[] | select(.status.phase!="Running") | .metadata.name')
    
    if [ -n "$kube_system_pods" ]; then
        warn "Found non-running pods in kube-system: $kube_system_pods"
    else
        success "All kube-system pods are running"
    fi
}

# Check node group resources
check_node_group_resources() {
    log "Checking node group resources..."
    
    local node_group_scaling
    node_group_scaling=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.scalingConfig')
    
    local min_size=$(echo "$node_group_scaling" | jq -r '.minSize')
    local max_size=$(echo "$node_group_scaling" | jq -r '.maxSize')
    local desired_size=$(echo "$node_group_scaling" | jq -r '.desiredSize')
    
    log "Node group scaling config - Min: $min_size, Max: $max_size, Desired: $desired_size"
    
    # Ensure we have capacity to add new nodes before removing old ones
    if [ "$desired_size" -ge "$max_size" ]; then
        error "Node group is already at maximum size. Cannot perform rolling upgrade. Increase maxSize first."
    fi
    
    success "Node group has sufficient capacity for rolling upgrade"
}

# Check for any ongoing operations
check_ongoing_operations() {
    log "Checking for ongoing operations on node group..."
    
    local nodegroup_status
    nodegroup_status=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.status')
    
    if [ "$nodegroup_status" != "ACTIVE" ]; then
        error "Node group is in $nodegroup_status state. Must be in ACTIVE state to upgrade."
    fi
    
    success "No ongoing operations, node group is ACTIVE"
}

# Check if there are any other node groups that share the same subnet to ensure capacity
check_subnet_capacity() {
    log "Checking subnet capacity..."
    
    local subnets
    subnets=$(aws eks describe-nodegroup --cluster-name "$CLUSTER_NAME" --nodegroup-name "$NODE_GROUP_NAME" | jq -r '.nodegroup.subnets[]')
    
    for subnet in $subnets; do
        local available_ips
        available_ips=$(aws ec2 describe-subnets --subnet-ids "$subnet" | jq -r '.Subnets[0].AvailableIpAddressCount')
        
        if [ "$available_ips" -lt 10 ]; then
            warn "Subnet $subnet has only $available_ips IPs remaining, may impact upgrade"
        else
            success "Subnet $subnet has sufficient IP capacity ($available_ips available)"
        fi
    done
}

# Main execution
main() {
    log "Starting pre-upgrade checks for node group $NODE_GROUP_NAME in cluster $CLUSTER_NAME"
    log "Target Kubernetes version: $TARGET_VERSION"
    echo "----------------------------------------"
    
    check_dependencies
    echo "----------------------------------------"
    
    check_cluster_exists
    echo "----------------------------------------"
    
    check_node_group_exists
    echo "----------------------------------------"
    
    check_cluster_version_compatibility
    echo "----------------------------------------"
    
    check_ongoing_operations
    echo "----------------------------------------"
    
    check_node_group_resources
    echo "----------------------------------------"
    
    check_subnet_capacity
    echo "----------------------------------------"
    
    check_cluster_health
    echo "----------------------------------------"
    
    success "All pre-upgrade checks completed successfully! Node group is ready for upgrade."
    echo "----------------------------------------"
}

main "$@"