resource "aws_ec2_transit_gateway" "main" {
  description = "GistPin Transit Gateway for multi-VPC connectivity"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
  tags = { Name = "gistpin-tgw" }
}
resource "aws_ec2_transit_gateway_route_table" "isolated" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags = { Name = "gistpin-tgw-isolated" }
}
resource "aws_ec2_transit_gateway_route" "blackhole" {
  for_each = toset(["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"])
  destination_cidr_block         = each.key
  blackhole                      = true
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.isolated.id
}
