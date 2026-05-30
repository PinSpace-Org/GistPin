resource "aws_route53_health_check" "gistpin_api" {
  fqdn              = "api.gistpin.io"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}
