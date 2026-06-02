# GistPin Best Practices

## Table of Contents

- [Code Quality](#code-quality)
- [Security](#security)
- [Observability](#observability)
- [Infrastructure](#infrastructure)
- [Database](#database)
- [API Design](#api-design)
- [Testing](#testing)
- [Deployment](#deployment)
- [Incident Management](#incident-management)

---

## Code Quality

### Backend (NestJS)

#### Service Structure

- Keep services focused on a single responsibility
- Use dependency injection, avoid singleton pattern abuse
- Return DTOs from controllers, never entity instances

```typescript
// Good - service returns DTO
@Get(':id')
async findOne(@Param('id') id: string): Promise<PinDto> {
  return this.pinsService.findOneById(id);
}

// Bad - service returns entity with ORM internals
@Get(':id')
async findOne(@Param('id') id: string): Promise<Pin> {
  return this.pinsRepository.findOne({ where: { id } });
}
```

#### Error Handling

- Use exception filters for consistent error responses
- Wrap external service calls in try/catch with detailed error contexts
- Never expose internal error messages to clients

```typescript
// Good - typed exception
if (!pin) {
  throw new NotFoundException('Pin not found');
}

// Bad - raw error exposure
if (!pin) {
  throw new Error(`Pin ${id} not found`);
}
```

#### Async/Await

- Always await promises, avoid unhandled rejections
- Use async/await over `.then()` chains
- Avoid async operations in constructors

```typescript
// Good
async onModuleInit() {
  this.connection = await this.service.connect();
}

// Bad
constructor() {
  this.service.connect().then(conn => this.connection = conn);
}
```

### Frontend (Next.js)

#### Server vs Client Components

- Default to Server Components for initial render
- Use 'use client' only when interactivity is required
- Fetch data in Server Components, pass as props

```typescript
// Good - Server Component
async function PinDetail({ id }: { id: string }) {
  const pin = await fetchPin(id);
  return <PinCard pin={pin} />;
}

// Bad - unnecessary client component
'use client';
function PinDetail({ id }: { id: string }) {
  const [pin, setPin] = useState(null);
  useEffect(() => { fetchPin(id).then(setPin); }, [id]);
  return <PinCard pin={pin} />;
}
```

#### State Management

- Use React state for UI-specific state
- Use TanStack Query for server state with caching
- Avoid prop drilling; use context sparingly

```typescript
// Good - cache-aware server state
const { data: pin, isLoading } = useQuery({
  queryKey: ['pin', id],
  queryFn: () => fetchPin(id),
});

// Bad - manual caching
const [pin, setPin] = useState<Pin | null>(null);
useEffect(() => {
  fetch(id).then(r => r.json()).then(setPin);
}, [id]);
```

---

## Security

### Input Validation

- Validate all inputs at the API boundary using class-validator
- Enforce strict types; avoid `any`
- Sanitize user input independently of validation

```typescript
class CreatePinDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsNotIn(INVALID_NAMES)
  name: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;
}

@Post()
@UseGuards(ValidationPipe) // Global pipe with whitelist: true
async create(@Body() dto: CreatePinDto) {
  return this.pinsService.create(dto);
}
```

### Secrets Management

- Never commit secrets to version control
- Use `.env` files for local development only
- Rotate secrets quarterly using automated procedures
- Envelope encryption for highly sensitive data

```text
DO:
  - Store secrets in env files with strict access control
  - Use secret references in Kubernetes ConfigMaps/Secrets
  - Rotate credentials via External Secrets Operator

DON'T:
  - Hardcode credentials in source files
  - Share secrets over Slack/email
  - Log secrets or authentication tokens
```

### Authentication & Authorization

- Use parameterized queries (ORM handles this)
- Implement rate limiting per endpoint
- Validate JWT/session on every requestNestJS
- Use HTTPS in production; enforce HSTS

```typescript
// Good - decorated guards
@UseGuards(JwtAuthGuard)
@Controller('pins')
export class PinsController {
  @Post()
  async create(@CurrentUser() user: User) {
    // user is type-safe, from guard
  }
}

// Bad - manual auth
@Post()
async create(@Req() req) {
  const user = req.headers.authorization; // deprecated
}
```

### CORS Configuration

```typescript
// Production example
app.enableCors({
  origin: [
    'https://app.gistpin.io',
    'https://admin.gistpin.io',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Observability

### Structured Logging

- Use structured JSON logging with consistent fields
- Include correlation IDs (trace ID, request ID)
- Log at appropriate levels (debug, info, warn, error)

```typescript
// Good
this.logger.log({
  message: 'Pin created',
  context: 'PinsService',
  pinId: pin.id,
  userId: user.id,
  traceId: context.getSpan()?.spanContext().traceId,
});

// Bad
this.logger.log(`Pin created: ${pin.id} by ${user.id}`);
```

### Metrics

- Instrument all business-critical operations
- Use appropriate metric types (counters, gauges, histograms)
- Tag metrics with service and environment labels

```typescript
// Good
const requestDuration = this.meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration',
  unit: 'ms',
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    requestDuration.record(Date.now() - start, {
      'http.route': req.route?.path,
      'http.status_code': res.statusCode,
    });
  });
  next();
});
```

### Distributed Tracing

- Propagate trace context across service boundaries
- Add custom spans for database and blockchain operations
- Sample based on environment (production: 10%, staging: 50%)

```typescript
const tracer = trace.getTracer('gistpin-backend');

async findPin(id: string): Promise<Pin> {
  return tracer.startActiveSpan('pins.findOne', async (span) => {
    try {
      const pin = await this.repo.findOne({ where: { id } });
      span.setAttributes({ 'pin.id': pin.id, 'pin.found': true });
      return pin;
    } finally {
      span.end();
    }
  });
}
```

---

## Infrastructure

### Docker

- Use multi-stage builds to reduce image size
- Run as non-root user in production
- Pin image tags (Digest), don't use `:latest`
- Scan images for vulnerabilities before pushing

```dockerfile
# Good - multi-stage with non-root
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Kubernetes

- Define resource requests and limits for all containers
- Use PodDisruptionBudgets for critical workloads
- Implement network policies
- Liveness and readiness probes for all containers

```yaml
# Good - complete container spec
containers:
  - name: backend
    image: "gistpin-backend:sha-abc123"
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Terraform

- Use remote backend for state (S3 + DynamoDB)
- Enable state locking and encryption
- Organize modules by resource type
- Tag all resources for cost attribution

```hcl
# Good - properly tagged resource
resource "aws_db_instance" "gistpin" {
  identifier           = "gistpin-${var.environment}"
  engine               = "postgres"
  instance_class       = "db.r6g.large"
  storage_encrypted    = true

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Service     = "gistpin-backend"
    CostCenter  = "engineering"
  }
}
```

---

## Database

### Query Patterns

- Use indexed columns in WHERE clauses
- Avoid SELECT * - specify columns explicitly
- Use connection pooling (PgBouncer recommended)
- Keep transactions short

```sql
-- Good - indexed columns, explicit columns
SELECT id, name, location, created_at
FROM pins
WHERE user_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Bad - unindexed column, SELECT *
SELECT * FROM pins;
```

### Migrations

- Write reversible migrations with both up and down
- Test migrations on a copy of production data
- Avoid non-transactional DDL in production

```sql
-- Good - reversible migration
-- Up
CREATE INDEX CONCURRENTLY pins_user_id_idx ON pins (user_id);

-- Down
DROP INDEX CONCURRENTLY pins_user_id_idx;
```

### Data Integrity

- Use database constraints (FOREIGN KEY, CHECK, UNIQUE)
- Prevent SQL injections through ORM usage
- Implement soft deletes using `deleted_at` timestamps
- Database-level IDs (UUID or SERIAL), not client-generated

---

## API Design

### REST Conventions

- Use nouns for resources (`/pins`, `/users`)
- Version APIs explicitly (`/api/v1/pins`)
- Return appropriate HTTP status codes
- Consistent error response format

```typescript
// Standard error response
{
  "success": false,
  "error": {
    "code": "PIN_NOT_FOUND",
    "message": "The requested pin does not exist",
    "details": {
      "pinId": "abc123",
      "userId": "user456"
    },
    "traceId": "abc123def456"
  }
}
```

### Pagination

- Use cursor-based pagination for large datasets
- Include pagination metadata in responses

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  };
}

// Endpoint
GET /api/v1/pins?cursor=abc123&limit=20
```

### Rate Limiting

- Implement rate limiting per authenticated user and IP
- Return Retry-After header when throttled
- Use sliding window algorithm

```typescript
@Controller('pins')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
export class PinsController {
  @Post()
  @Throttle({ create: { limit: 10, ttl: 60000 } })
  create(@CurrentUser() user: User) {
    // 10 requests per minute for pin creation
  }
}
```

---

## Testing

### Unit Tests

- Write unit tests for services and utilities
- Mock external dependencies (database, blockchain)
- Use meaningful test names, not just "test works"

```typescript
describe('PinsService', () => {
  let service: PinsService;
  let mockRepo: jest.Mocked<TypeOrmRepository<Pin>>;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;
    const module = await Test.createTestingModule({
      providers: [PinsService, { provide: PinsRepository, useValue: mockRepo }],
    }).compile();
    service = module.get(PinsService);
  });

  it('should return NotFoundException when pin does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });
});
```

### Integration Tests

- Test API endpoints using supertest
- Use test database (different from dev/prod)
- Clean up test data after each test

```typescript
describe('PinsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, TypeOrmModule.forRoot({ /* test DB */ })],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/pins (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/pins')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Test', coordinates: { lat: 0, lon: 0 } })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
      });
  });
});
```

### E2E Tests

- Critical user flows: signup, pin creation, social interactions
- Test against staging environment
- Include blockchain interactions when feasible

---

## Deployment

### Release Process

- Use semantic versioning or git SHA for image tags
- Deploy to staging before production
- Blue-green or canary deployment for production
- Monitor error rates and latency post-deployment

### Environment Parity

- Keep development, staging, production configurations similar
- Test infrastructure changes in staging first
- Use feature flags for gradual rollouts

### Rollback Safety

- Database migrations must be reversible
- Feature flags enable instant rollback without deploy
- Automate rollback on health check failures

---

## Incident Management

### On-Call Practices

- Rotate on-call weekly with handoff documentation
- Use blameless post-mortems
- Document runbooks for common failure modes

### Alert Design

- Alert on symptoms, not causes (SLO-based)
- Reduce alert noise with proper thresholds
- Include runbook links in alert descriptions

```yaml
# Good alert rule - symptom-based
alert: GistPinHighErrorRate
expr: |
  sum(rate(http_requests_total{service="gistpin-backend", status=~"5.."}[5m]))
  / sum(rate(http_requests_total{service="gistpin-backend"}[5m])) > 0.05
for: 5m
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value }} (threshold: 5%)"
  runbook_url: "https://wiki/runbooks/high-error-rate"
```

### Post-Incident Review

- Schedule post-mortem within 48 hours
- Focus on process, not people
- Generate actionable follow-ups with owners

#### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]
- **Date**: YYYY-MM-DD
- **Severity**: P1 / P2 / P3
- **Duration**: X hours Y minutes
- **Author**: Name

## Summary
Brief description of the incident.

## Timeline
- HH:MM - Event observed
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Resolution applied

## Root Cause
Technical explanation of what went wrong.

## Impact
- Affected users: X%
- Duration: X minutes
- Data loss: None / Limited

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add alert for X | @engineer | YYYY-MM-DD | TODO |
```
