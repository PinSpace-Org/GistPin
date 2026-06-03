#!/usr/bin/env python3
"""GistPin Gist metrics exporter — exposes Gist creation and interaction metrics on /metrics."""

import argparse
import os
import sys
import time
from prometheus_client import start_http_server, Gauge, Counter, Histogram

# --- Prometheus metrics ---
GISTS_TOTAL = Counter(
    "gistpin_gists_total",
    "Total gists created since exporter start",
    ["location", "category"],
)
GISTS_ACTIVE = Gauge(
    "gistpin_gists_active",
    "Currently active (non-expired) gists",
    ["location"],
)
GIST_CREATION_RATE = Gauge(
    "gistpin_gist_creation_rate_per_minute",
    "Rolling creation rate (gists/min)",
)
GIST_LIFETIME = Histogram(
    "gistpin_gist_lifetime_seconds",
    "Gist lifetime until expiry or deletion",
    buckets=[60, 300, 900, 1800, 3600, 7200, 14400, 86400],
)
GIST_INTERACTIONS = Counter(
    "gistpin_gist_interactions_total",
    "Total interactions (views, reactions, comments)",
    ["interaction_type"],
)
GISTS_BY_RADIUS = Histogram(
    "gistpin_gist_radius_meters",
    "Distance radius of gist visibility",
    buckets=[100, 500, 1000, 5000, 10000, 50000],
)
IPFS_PINS = Gauge(
    "gistpin_ipfs_pins_active",
    "Active IPFS pins for gist content",
)
DB_CONNECTION_POOL = Gauge(
    "gistpin_db_pool_connections",
    "Database connection pool usage",
    ["state"],
)


def collect_db_stats():
    """Fetch database-level metrics from Postgres."""
    try:
        import psycopg2

        conn = psycopg2.connect(os.environ.get("DATABASE_URL", ""))
        cur = conn.cursor()

        # Connection pool state
        cur.execute(
            "SELECT state, count(*) FROM pg_stat_activity "
            "WHERE datname = current_database() GROUP BY state"
        )
        for row in cur.fetchall():
            DB_CONNECTION_POOL.labels(state=row[0]).set(row[1])

        # Active gists count
        cur.execute(
            "SELECT count(*) FROM gists WHERE expires_at > now() OR expires_at IS NULL"
        )
        active_count = cur.fetchone()[0]
        GISTS_ACTIVE.labels(location="global").set(active_count)

        # Gist creation counts by category (last 1h)
        cur.execute(
            "SELECT category, count(*) FROM gists "
            "WHERE created_at > now() - interval '1 hour' "
            "GROUP BY category"
        )
        for row in cur.fetchall():
            GISTS_TOTAL.labels(location="global", category=row[0]).inc(row[1])

        # Gist interactions in last hour
        cur.execute(
            "SELECT interaction_type, count(*) FROM gist_interactions "
            "WHERE created_at > now() - interval '1 hour' "
            "GROUP BY interaction_type"
        )
        for row in cur.fetchall():
            GIST_INTERACTIONS.labels(interaction_type=row[0]).inc(row[1])

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB stats collection skipped: {e}", file=sys.stderr)


def collect_gist_rate():
    """Calculate rolling creation rate from database.

    Queries gist creation count over the last minute and sets
    the GIST_CREATION_RATE gauge. Falls back to zero on DB error.
    """
    try:
        import psycopg2

        conn = psycopg2.connect(os.environ.get("DATABASE_URL", ""))
        cur = conn.cursor()
        cur.execute(
            "SELECT count(*) FROM gists WHERE created_at > now() - interval '1 minute'"
        )
        rate = cur.fetchone()[0]
        GIST_CREATION_RATE.set(rate)
        cur.close()
        conn.close()
    except Exception:
        GIST_CREATION_RATE.set(0)


def main():
    parser = argparse.ArgumentParser(description="GistPin Gist Metrics Exporter")
    parser.add_argument("--port", type=int, default=9101, help="Metrics HTTP port")
    parser.add_argument("--interval", type=int, default=30, help="Collection interval in seconds")
    parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL", ""),
                        help="PostgreSQL connection URL")
    args = parser.parse_args()

    # Always prefer the explicit --db-url argument over env var
    if args.db_url:
        os.environ["DATABASE_URL"] = args.db_url
    else:
        print("DATABASE_URL not set — running without DB metrics", file=sys.stderr)

    # Start metrics HTTP server
    start_http_server(args.port)
    print(f"GistPin Gist exporter listening on :{args.port}/metrics", file=sys.stderr)

    # Background collection loop
    while True:
        if args.db_url:
            collect_db_stats()
            collect_gist_rate()
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
