package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestVpcCreation(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	vpcID := terraform.Output(t, opts, "vpc_id")
	assert.NotEmpty(t, vpcID, "VPC ID should not be empty")

	cidrBlock := terraform.Output(t, opts, "vpc_cidr_block")
	assert.Equal(t, "10.0.0.0/16", cidrBlock, "VPC CIDR should be 10.0.0.0/16")
}

func TestSubnetCounts(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	publicSubnets := terraform.OutputList(t, opts, "public_subnet_ids")
	privateSubnets := terraform.OutputList(t, opts, "private_subnet_ids")

	assert.Len(t, publicSubnets, 2, "Should have 2 public subnets")
	assert.Len(t, privateSubnets, 2, "Should have 2 private subnets")
}

func TestSubnetCidrAssignments(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	publicCidrs := terraform.OutputList(t, opts, "public_subnet_cidrs")
	privateCidrs := terraform.OutputList(t, opts, "private_subnet_cidrs")

	expectedPublic := []string{"10.0.1.0/24", "10.0.2.0/24"}
	expectedPrivate := []string{"10.0.11.0/24", "10.0.12.0/24"}

	assert.ElementsMatch(t, expectedPublic, publicCidrs, "Public subnet CIDRs should match")
	assert.ElementsMatch(t, expectedPrivate, privateCidrs, "Private subnet CIDRs should match")
}

func TestInternetGatewayAttachment(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	igwID := terraform.Output(t, opts, "internet_gateway_id")
	assert.NotEmpty(t, igwID, "Internet Gateway ID should not be empty")

	vpcID := terraform.Output(t, opts, "vpc_id")
	igwVpcID := terraform.Output(t, opts, "internet_gateway_vpc_id")
	assert.Equal(t, vpcID, igwVpcID, "Internet Gateway should be attached to the VPC")
}

func TestNatGatewayConfiguration(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	natIDs := terraform.OutputList(t, opts, "nat_gateway_ids")
	assert.NotEmpty(t, natIDs, "Should have at least one NAT Gateway")

	natPublicIPs := terraform.OutputList(t, opts, "nat_public_ips")
	for i, ip := range natPublicIPs {
		assert.NotEmpty(t, ip, "NAT Gateway %d should have a public IP", i)
	}
}

func TestRouteTableEntries(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	publicRouteTableID := terraform.Output(t, opts, "public_route_table_id")
	assert.NotEmpty(t, publicRouteTableID, "Public route table ID should not be empty")

	privateRouteTableIDs := terraform.OutputList(t, opts, "private_route_table_ids")
	assert.Len(t, privateRouteTableIDs, 2, "Should have 2 private route tables")

	routes := terraform.OutputList(t, opts, "public_route_table_routes")
	foundDefault := false
	for _, r := range routes {
		if r == "0.0.0.0/0" {
			foundDefault = true
			break
		}
	}
	assert.True(t, foundDefault, "Public route table should have a default route to the Internet Gateway")

	for i, rtID := range privateRouteTableIDs {
		assert.NotEmpty(t, rtID, "Private route table %d should not be empty", i)
		privateRoutes := terraform.OutputList(t, opts, fmt.Sprintf("private_route_table_%d_routes", i))
		foundNat := false
		for _, r := range privateRoutes {
			if r == "0.0.0.0/0" {
				foundNat = true
				break
			}
		}
		assert.True(t, foundNat, "Private route table %d should have a default route to the NAT Gateway", i)
	}
}

func TestVpcDnsSupport(t *testing.T) {
	opts := DefaultTerraformOptions(t, "../modules/vpc")
	ApplyAndDestroyWithCleanup(t, opts)

	dnsSupport := terraform.Output(t, opts, "vpc_dns_support")
	assert.Equal(t, "true", dnsSupport, "VPC should have DNS support enabled")

	dnsHostnames := terraform.Output(t, opts, "vpc_dns_hostnames")
	assert.Equal(t, "true", dnsHostnames, "VPC should have DNS hostnames enabled")
}
