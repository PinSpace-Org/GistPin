resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  for_each = var.vpc_ids
  subnet_ids         = each.value.subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = each.key
  tags = { Name = "tgw-attach-${each.value.name}" }
}
resource "aws_ec2_transit_gateway_route_table_association" "main" {
  for_each = aws_ec2_transit_gateway_vpc_attachment.main
  transit_gateway_attachment_id  = each.value.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway.main.association_default_route_table_id
}
