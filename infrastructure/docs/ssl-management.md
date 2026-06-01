# SSL/TLS Certificate Management

Automated certificate lifecycle management for GistPin using Let's Encrypt.

## Scripts

### `cert-renewal.sh`
Checks certificate expiry and renews via certbot when within the threshold window.

**Environment variables:**
| Variable | Default | Description |
|---|---|---|
| `DOMAIN` | `gistpin.io` | Primary domain |
| `CERT_EMAIL` | `admin@gistpin.io` | Let's Encrypt registration email |
| `CERT_DIR` | `/etc/letsencrypt/live/$DOMAIN` | Certificate directory |
| `RENEW_THRESHOLD_DAYS` | `30` | Days before expiry to trigger renewal |
| `WILDCARD` | `false` | Set to `true` to issue wildcard cert via DNS-01 |

**Usage:**
```bash
# Standard renewal
DOMAIN=gistpin.io bash infrastructure/scripts/cert-renewal.sh

# Wildcard certificate (requires DNS-01 / Route53 plugin)
DOMAIN=gistpin.io WILDCARD=true bash infrastructure/scripts/cert-renewal.sh
```

### `cert-check.sh`
Checks expiry for one or more domains and sends Slack alerts on warning/critical thresholds.

**Environment variables:**
| Variable | Default | Description |
|---|---|---|
| `DOMAINS` | `gistpin.io api.gistpin.io` | Space-separated list of domains |
| `WARN_DAYS` | `30` | Days threshold for warning alert |
| `CRITICAL_DAYS` | `7` | Days threshold for critical alert |
| `SLACK_WEBHOOK` | _(empty)_ | Slack incoming webhook URL |

**Exit codes:** `0` = all OK, `1` = warning, `2` = critical / error

**Usage:**
```bash
DOMAINS="gistpin.io api.gistpin.io" SLACK_WEBHOOK="https://hooks.slack.com/..." \
  bash infrastructure/scripts/cert-check.sh
```

## Automation

Schedule both scripts via Kubernetes CronJob or cron:

```cron
# Check daily at 08:00 UTC
0 8 * * * /opt/gistpin/infrastructure/scripts/cert-check.sh

# Attempt renewal daily at 03:00 UTC
0 3 * * * /opt/gistpin/infrastructure/scripts/cert-renewal.sh
```

## Wildcard Certificates

Wildcard certs (`*.gistpin.io`) require DNS-01 challenge. The renewal script uses the
`certbot-dns-route53` plugin. Ensure the host has an IAM role with `route53:ChangeResourceRecordSets`
permission on the hosted zone.

## Certificate Storage

Certificates are stored by certbot at `/etc/letsencrypt/live/<domain>/`. The Kubernetes
`tls-secrets.yaml` should be updated after renewal using:

```bash
kubectl create secret tls gistpin-tls \
  --cert=/etc/letsencrypt/live/gistpin.io/fullchain.pem \
  --key=/etc/letsencrypt/live/gistpin.io/privkey.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```
