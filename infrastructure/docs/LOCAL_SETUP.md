# Local Infrastructure Setup

Step-by-step guide to run the full GistPin stack locally.

## 1. Clone the Repository

```bash
git clone https://github.com/PinSpace-Org/GistPin.git
cd GistPin
```

## 2. Install Tools

Follow [TOOLS.md](./TOOLS.md) for version-specific installation instructions.

## 3. Configure Environment

```bash
cp Backend/.env.example Backend/.env
# Edit Backend/.env and fill in required values
```

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SOROBAN_RPC_URL` | Stellar Soroban RPC endpoint |
| `IPFS_API_URL` | IPFS API endpoint |

## 4. Start Local Services with Docker Compose

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

This starts PostgreSQL and any supporting services. Verify they are healthy:

```bash
docker compose -f infrastructure/docker/docker-compose.yml ps
```

## 5. Run Database Migrations

```bash
cd Backend
npm install
npm run migration:run
```

## 6. Start the Backend

```bash
cd Backend
npm run start:dev
```

The API is available at `http://localhost:3000`.

## 7. Start the Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3001`.

## 8. Verify the Stack

```bash
curl http://localhost:3000/health
```

Expected response: `{"status":"ok"}`

## Stopping Services

```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```

## Common Issues

| Problem | Fix |
|---------|-----|
| Port 5432 already in use | Stop local PostgreSQL: `sudo service postgresql stop` |
| Migration fails | Check `DATABASE_URL` in `.env` points to the running container |
| Frontend can't reach API | Ensure `NEXT_PUBLIC_API_URL` is set in `Frontend/.env.local` |
