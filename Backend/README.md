# GistPin Backend

## API Authentication Model (MVP Decision)

**Decision:** The MVP intentionally has **no API-level authentication** beyond the global rate limiter.

### Rationale
- **Anonymous-first ethos**: GistPin's core value proposition is frictionless, pseudonymous posting. Requiring API keys for writes would add onboarding friction that contradicts this.
- **Global rate limiting is sufficient for MVP**: The existing global rate limiter (configured in `ThrottlerModule`) provides DoS protection without per-client identity.
- **Avoid dead code**: A complete but unused `api-keys` module (`ApiKeyGuard`, `ApiKeyService`, hashed tokens, rate-limit tracking) existed in the tree. Keeping unused auth code creates confusion and maintenance burden.

### Pre-Launch Follow-Up
Before public launch, revisit:
1. **Per-client rate limits** — If abuse patterns emerge, implement API keys with generous free tiers.
2. **Admin/moderation endpoints** — These will need auth regardless of public API policy.
3. **Webhook signatures** — For outbound callbacks, HMAC signatures are preferable to API keys.

### Current Protection
- **Global rate limiter**: `ThrottlerModule` with configurable TTL/limit (see `src/config/configuration.ts`)
- **Input validation**: Class-validator DTOs on all endpoints
- **CORS**: Restricted to known origins in production

## Development

```bash
# Install dependencies
npm ci

# Run in development mode
npm run start:dev

# Build
npm run build

# Test
npm run test:cov
```

## Project Structure

```
src/
├── app.module.ts          # Root module
├── common/                # Shared utilities, filters, interceptors
├── config/                # Configuration & env validation
├── database/              # TypeORM data source & migrations
├── gists/                 # Gist CRUD & search (main domain)
├── geo/                   # Geospatial queries
├── health/                # Health check endpoint
├── indexer/               # Blockchain event indexer
├── ipfs/                  # IPFS pinning service
├── metrics/               # Prometheus metrics
└── shutdown/              # Graceful shutdown handling
```

## Environment Variables

See `.env.example` for all required variables.

## License

MIT