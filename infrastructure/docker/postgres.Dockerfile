FROM postgres:16-alpine

ENV POSTGRES_USER=gistpin \
    POSTGRES_PASSWORD=gistpin \
    POSTGRES_DB=gistpin

# Custom init scripts run in alphabetical order on first start
COPY postgres-init.sql /docker-entrypoint-initdb.d/01-init.sql

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1

EXPOSE 5432
