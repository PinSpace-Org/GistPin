package test

import (
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestEksClusterCreation(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	clusterName := terraform.Output(t, opts, "cluster_name")
	assert.NotEmpty(t, clusterName, "EKS cluster name should not be empty")

	clusterVersion := terraform.Output(t, opts, "cluster_version")
	assert.Equal(t, "1.29", clusterVersion, "EKS cluster version should be 1.29")

	clusterStatus := terraform.Output(t, opts, "cluster_status")
	assert.Equal(t, "ACTIVE", clusterStatus, "EKS cluster should be ACTIVE")

	endpoint := terraform.Output(t, opts, "cluster_endpoint")
	assert.NotEmpty(t, endpoint, "EKS cluster endpoint should not be empty")
}

func TestEksNodeGroupConfiguration(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	nodeGroupName := terraform.Output(t, opts, "node_group_name")
	assert.NotEmpty(t, nodeGroupName, "Node group name should not be empty")

	instanceTypes := terraform.OutputList(t, opts, "node_group_instance_types")
	assert.Contains(t, instanceTypes, "t3.medium", "Node group should use t3.medium instances")

	desiredSize := terraform.Output(t, opts, "node_group_desired_size")
	assert.Equal(t, "2", desiredSize, "Node group desired size should be 2")

	minSize := terraform.Output(t, opts, "node_group_min_size")
	assert.Equal(t, "1", minSize, "Node group min size should be 1")

	maxSize := terraform.Output(t, opts, "node_group_max_size")
	assert.Equal(t, "5", maxSize, "Node group max size should be 5")
}

func TestEksIamRoles(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	clusterRoleARN := terraform.Output(t, opts, "cluster_iam_role_arn")
	assert.NotEmpty(t, clusterRoleARN, "Cluster IAM role ARN should not be empty")
	assert.Contains(t, clusterRoleARN, "eks-cluster-role", "Cluster IAM role name should contain eks-cluster-role")

	nodeRoleARN := terraform.Output(t, opts, "node_iam_role_arn")
	assert.NotEmpty(t, nodeRoleARN, "Node IAM role ARN should not be empty")
	assert.Contains(t, nodeRoleARN, "eks-nodes-role", "Node IAM role name should contain eks-nodes-role")
}

func TestEksSecurityGroups(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	clusterSGID := terraform.Output(t, opts, "cluster_security_group_id")
	assert.NotEmpty(t, clusterSGID, "Cluster security group ID should not be empty")

	nodeSGID := terraform.Output(t, opts, "node_security_group_id")
	assert.NotEmpty(t, nodeSGID, "Node security group ID should not be empty")
}

func TestEksIrsaConfiguration(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	oidcProviderARN := terraform.Output(t, opts, "oidc_provider_arn")
	assert.NotEmpty(t, oidcProviderARN, "OIDC provider ARN should not be empty")
	assert.Contains(t, oidcProviderARN, "oidc.eks", "OIDC provider ARN should reference EKS")

	irsaRoles := terraform.OutputList(t, opts, "irsa_role_names")
	expectedRoles := []string{"gistpin-backend-irsa", "gistpin-frontend-irsa"}
	for _, expected := range expectedRoles {
		assert.Contains(t, irsaRoles, expected, "IRSA role %s should be created", expected)
	}
}

func TestEksClusterEndpointAccess(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	privateAccess := terraform.Output(t, opts, "cluster_endpoint_private_access")
	assert.Equal(t, "true", privateAccess, "Cluster endpoint private access should be enabled")

	publicAccess := terraform.Output(t, opts, "cluster_endpoint_public_access")
	assert.Equal(t, "true", publicAccess, "Cluster endpoint public access should be enabled")
}

func TestEksNodeGroupInPrivateSubnets(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/eks")
	ApplyAndDestroyWithCleanup(t, opts)

	nodeSubnetIDs := terraform.OutputList(t, opts, "node_group_subnet_ids")
	privateSubnetIDs := terraform.OutputList(t, opts, "private_subnet_ids")

	for _, subnet := range nodeSubnetIDs {
		assert.Contains(t, privateSubnetIDs, subnet, "Node group subnets should be in private subnets")
	}
}
