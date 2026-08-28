# CloudFront Security Headers Policy

## Overview

The `aws_cloudfront_response_headers_policy` resource defined in
`infrastructure/terraform/cloudfront-headers.tf` injects the following HTTP response
headers on every CloudFront response, hardening the application against common web
vulnerabilities without requiring changes to the origin server.

## Headers Applied

### Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `max-age` | 63072000 (2 years) | Browser caches the HTTPS requirement |
| `includeSubDomains` | enabled | Covers all subdomains |
| `preload` | enabled | Eligible for browser HSTS preload lists |

### Content-Security-Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
  font-src 'self'; connect-src 'self'; frame-ancestors 'none';
  base-uri 'self'; form-action 'self'
```

Mitigates XSS by restricting resource load origins. Tighten `script-src` by removing
`'unsafe-inline'` and using a nonce-based approach for production workloads.

### X-Frame-Options

```
X-Frame-Options: DENY
```

Prevents the page from being embedded in any `<frame>`, `<iframe>`, or `<object>`,
blocking clickjacking attacks.

### X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Instructs browsers not to MIME-sniff the response content type, preventing certain
content-injection attacks.

### Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

Disables access to sensitive browser APIs that the application does not use.

### Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Sends the full URL as the referrer for same-origin requests; sends only the origin for
cross-origin requests; sends nothing for downgrades (HTTPS → HTTP).

### X-XSS-Protection *(legacy)*

```
X-XSS-Protection: 1; mode=block
```

Enables the built-in XSS filter in older browsers (IE/Edge). Modern browsers rely on
CSP instead.

## Attaching the Policy to a Distribution

Reference `output.security_headers_policy_id` in your CloudFront distribution's cache
behavior:

```hcl
default_cache_behavior {
  response_headers_policy_id = module.security_headers.security_headers_policy_id
  # ... other settings
}
```

## Testing Headers

```bash
curl -sI https://your-cloudfront-domain.cloudfront.net | grep -i \
  -e strict-transport \
  -e content-security \
  -e x-frame \
  -e x-content-type \
  -e permissions-policy \
  -e referrer-policy
```

## References

- [MDN HTTP Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [AWS CloudFront Response Headers Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-response-headers.html)
