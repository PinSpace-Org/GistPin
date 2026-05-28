# CI Cache Strategy

This project uses layered cache buckets to reduce CI runtime:

## Dependency Caches
- npm cache: `~/.npm`, `**/node_modules`
- cargo cache: `~/.cargo/registry`, `~/.cargo/git`, `contracts/target`

## Build Caches
- Docker buildx cache: `/tmp/.buildx-cache`
- Build artifacts: `Frontend/dist`, `Backend/dist`, `analytics/dist`

## Cache Invalidation
- npm cache keys change when lock files (`**/package-lock.json`) change
- cargo cache keys change when `Cargo.lock` changes
- Docker cache keys change when Dockerfiles/infrastructure docker files change

## Monitoring Cache Effectiveness
- Use workflow step timing metrics from GitHub Actions
- Track cache restore and save logs
- Compare cold-start runs versus warm-cache runs weekly
