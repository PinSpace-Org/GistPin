# Secrets Management Strategy

## Overview
This repository uses a layered strategy for application configuration and secrets:
- `ConfigMap` for non-sensitive runtime config
- `SealedSecret` for encrypted secret material in git
- `ExternalSecret` for pulling secrets from an external store with periodic refresh

## Version Control Strategy
- Commit only templates/placeholders for raw `Secret` objects
- Commit sealed/encrypted payloads instead of plaintext values
- Keep sensitive values out of CI logs and pull request descriptions

## Rotation Procedure
1. Rotate credential in source system (DB, Redis, identity provider, etc.)
2. Update secret manager entry used by `ExternalSecret`
3. Re-seal values for fallback `SealedSecret` flow (if used)
4. Roll deployment to pick up new secret versions
5. Validate service health and revoke old credentials

## Operational Notes
- `ExternalSecret` refreshes every hour by default
- Use namespace-scoped secret stores and least-privilege RBAC for secret reads
- Store emergency recovery secrets in restricted break-glass vault paths
