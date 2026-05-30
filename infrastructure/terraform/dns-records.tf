resource "aws_route53_record" "root_a" {
  zone_id = aws_route53_zone.gistpin.zone_id
  name    = "gistpin.io"
  type    = "A"
  ttl     = 300
  records = ["0.0.0.0"] # replace with actual ALB IP or use alias
}

resource "aws_route53_record" "api_cname" {
  zone_id = aws_route53_zone.gistpin.zone_id
  name    = "api.gistpin.io"
  type    = "CNAME"
  ttl     = 300
  records = ["alb.gistpin.io"]
}
