resource "aws_internet_gateway" "gistpin" {
  vpc_id = aws_vpc.gistpin.id
  tags   = { Name = "gistpin-igw" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "gistpin" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags          = { Name = "gistpin-nat" }
  depends_on    = [aws_internet_gateway.gistpin]
}
