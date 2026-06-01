# GistPin Setup Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Setup](#docker-setup)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [CI/CD Setup](#cicd-setup)
- [Monitoring Setup](#monitoring-setup)

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ LTS | Runtime for backend and frontend |
| PostgreSQL | 16+ | Primary data store |
| Docker | 24+ | Containerization |
| Docker Compose | 2.20+ | Local services orchestration |
| Git | 2.40+ | Version control |

### Optional Tools

| Tool | Version | Purpose |
|------|---------|---------|
| kubectl | 1.28+ | Kubernetes cluster management |
| Helm | 3.12+ | Package management for K8s |
| Terraform | 1.5+ | Infrastructure as Code |
| AWS CLI | 2.0+ | Terraform backend setup |

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/PinSpace-Org/GistPin.git
cd GistPin
```

### 2. Install Dependencies

```bash
# Backend
cd Backend
npm install

# Frontend (from root)
cd ../Frontend
npm install
```

### 3. Configure Environment

#### Backend Environment Variables

Copy the example environment file:

```bash
cd Backend
cp .env.example .env
```

Required variables in `.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://gistpin:gistpin@localhost:5432/gistpin

# Session
SESSION_SECRET=your-secret-key-here

# Blockchain
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_ID_GIST_REGISTRY=your-contract-id-here

# CORS
CORS_ORIGINS=http://localhost:3001

# IPFS
IPFS_GATEWAY_URL=https://ipfs.infura.io
IPFS_API_URL=https://ipfs.infura.io

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=gistpin-backend
```

#### Frontend Environment Variables

Create `Frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_CONTRACT_ID_GIST_REGISTRY=your-contract-id-here
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.infura.io
```

### 4. Database Setup

```bash
# Start PostgreSQL locally (or use Docker Compose)
docker run --name gistpin-postgres \
  -e POSTGRES_USER=gistpin \
  -e POSTGRES_PASSWORD=gistpin \
  -e POSTGRES_DB=gistpin \
  -p 5432:5432 \
  -d postgres:16-alpine

# Run database migrations
cd Backend
npm run migration:run

# (Optional) Seed initial data
npm run seed
```

### 5. Start Development Servers

#### Terminal 1 - Backend

```bash
cd Backend
npm run start:dev
```

Backend will be available at `http://localhost:3000`

#### Terminal 2 - Frontend

```bash
cd Frontend
npm run dev
```

Frontend will be available at `http://localhost:3001`

## Docker Setup

### Using Docker Compose (Recommended for Local Dev)

```bash
# Start all services
docker compose -f infrastructure/docker/docker-compose.yml up

# Services:
# - Backend: http://localhost:3000
# - Frontend: http://localhost:3001
# - PostgreSQL: localhost:5432
```

### Building Images

```bash
# Build all services
docker compose build

# Build specific service
docker compose build backend
```

### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### Production Build with OTel

```bash
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.28+ cluster (EKS, GKE, AKS, or kind)
- kubectl configured to target your cluster
- Helm 3.12+ installed
- Container registry access (ECR, GCR, Docker Hub, etc.)

### 1. Install Prerequisites

```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace
```

### 2. Deploy Application

```bash
# Add Bitnami repo for PostgreSQL sub-chart
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install or upgrade
helm upgrade --install gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin --create-namespace \
  --set backend.image.tag=sha-$(git rev-parse HEAD) \
  --set backend.env.SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org \
  -f infrastructure/k8s/helm/gistpin/values.prod.yaml
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n gistpin

# Check services
kubectl get svc -n gistpin

# Check ingress
kubectl get ingress -n gistpin

# Port-forward for local testing
kubectl port-forward svc/backend 3000:3000 -n gistpin
kubectl port-forward svc/analytics 3001:3000 -n gistpin
```

### 4. Configure TLS

```bash
# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Environment Configuration

### Environment Files

| Environment | Backend File | Frontend File | Purpose |
|-------------|-------------|---------------|---------|
| Local development | `Backend/.env` | `Frontend/.env.local` | Developer workstations |
| Docker | `.env` in root | `.env.local` | Container environments |
| Kubernetes | ConfigMap + Secret | ConfigMap | In-cluster config |
| Production | AWS SSM / Vault | Not used (build-time) | Live environment |

### Required Configuration by Environment

#### Development
- Local PostgreSQL
- Soroban testnet
- IPFS test gateway
- Debug logging enabled

#### Staging
- Managed PostgreSQL (RDS/Aurora)
- Soroban testnet
- Separate Soroban contract deployment
- Reduced sampling rate for tracing

#### Production
- Managed PostgreSQL (Aurora Serverless v2)
- Soroban mainnet
- Pinned contract deployment
- Full observability stack
- Backup strategy active

## Database Setup

### Local PostgreSQL

```bash
# Create database
createdb gistpin

# Run migrations
cd Backend
npm run migration:run

# (Optional) Seed data
npm run seed
```

### AWS RDS (Production)

```hcl
# infrastructure/terraform/modules/database/main.tf
resource "aws_db_instance" "gistpin" {
  identifier           = "gistpin-${var.environment}"
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  storage_encrypted    = true

  db_name              = "gistpin"
  username             = "gistpin"
  password             = random.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.gistpin.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  skip_final_snapshot     = false
  final_snapshot_identifier = "gistpin-${var.environment}-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Environment = var.environment
  }
}
```

### Database Migrations

```bash
# Generate a new migration
cd Backend
npm run migration:generate -- src/database/migrations/CreateNewTable

# Apply all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Run migrations in CI/CD
npm run migration:run
```

## CI/CD Setup

### GitHub Actions

The CI/CD pipeline is configured in `.github/workflows/`.

**Pipelines:**
1. `ci.yml` - Lint, test, build on PR
2. `deploy.yml` - Deploy to staging/production on merge
3. `security.yml` - Dependency scanning and audits

### Required Secrets

```
GITHUB_TOKEN          # Auto-provided
AWS_ACCESS_KEY_ID     # Terraform and ECR access
AWS_SECRET_ACCESS_KEY
DOCKER_REGISTRY_URL   # ECR or Docker Hub
DATABASE_URL          # Production database
STELLAR_SECRET_KEY    # For contract interactions
```

## Monitoring Setup

### Grafana Dashboards

Pre-configured dashboards in `infrastructure/monitoring/grafana/dashboards/`:

- GistPin API Overview
- Database Performance
- Soroban Blockchain Metrics
- Infrastructure Health

### Alert Rules

Configured in `infrastructure/monitoring/alert-rules.yml`:

- API error rate > 5%
- Database connection pool exhaustion
- High latency (p95 > 2s)
- Pod restart loops

### OpenTelemetry Configuration

See `infrastructure/docs/opentelemetry.md` for:
- Collector deployment
- Instrumentation setup
- Sampling configuration

## Verification

After setup, verify each component:

```bash
# 1. Backend health
curl http://localhost:3000/health

# 2. Database connection
curl http://localhost:3000/health/db

# 3. Blockchain connectivity
curl http://localhost:3000/health/blockchain

# 4. Frontend loads
curl http://localhost:3001

# 5. Metrics endpoint
curl http://localhost:3000/metrics

# 6. Prometheus targets
curl http://localhost:9090/targets

# 7. Grafana dashboards
open http://localhost:3000/dashboards
```

## Common Setup Issues

| Issue | Solution |
|-------|----------|
| `DATABASE_URL` connection refused | Ensure PostgreSQL is running on port 5432 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` timeout | Start otel-collector or disable telemetry |
| `401 Unauthorized` on API | Check `SESSION_SECRET` is set |
| Soroban `404 Not Found` | Verify RPC URL and network passphrase |
| Frontend build fails | Run `npm install` in both root and Frontend |

## Next Steps

1. Read [Architecture](./ARCHITECTURE.md) for system design
2. Review [Troubleshooting](./TROUBLESHOOTING.md) for common issues
3. Follow [Runbooks](./RUNBOOKS.md) for operational procedures
4. Study [Best Practices](./BEST_PRACTICES.md) for development standards
