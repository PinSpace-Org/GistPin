###############################################################################
# CloudFront Response Headers Policy – Security Headers
# Issue #1127: AWS CloudFront security headers policy
###############################################################################

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project}-${var.environment}-security-headers"
  comment = "Enforces security headers on all CloudFront responses"

  security_headers_config {
    # HTTP Strict Transport Security
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2 years
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    # Prevent MIME-type sniffing
    content_type_options {
      override = true
    }

    # Clickjacking protection
    frame_options {
      frame_option = "DENY"
      override     = true
    }

    # Cross-site scripting protection (legacy browsers)
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    # Referrer policy
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    # Content Security Policy
    items {
      header   = "Content-Security-Policy"
      value    = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      override = true
    }

    # Permissions Policy (formerly Feature-Policy)
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
      override = true
    }

    # Cache control for sensitive pages (override at origin if needed)
    items {
      header   = "Cache-Control"
      value    = "no-store, no-cache, must-revalidate, proxy-revalidate"
      override = false
    }
  }

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["Authorization", "Content-Type", "X-Requested-With"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = var.allowed_origins
    }

    access_control_expose_headers {
      items = ["ETag", "x-request-id"]
    }

    access_control_max_age_sec = 3600
    origin_override            = false
  }
}
