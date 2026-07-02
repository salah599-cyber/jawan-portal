#!/usr/bin/env bash
set -euo pipefail

# Sync PE tables with raw SQL (no Prisma Migrate) so Vercel never hits P3005.
if [ -n "${POSTGRES_URL_NON_POOLING:-${POSTGRES_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}}" ]; then
  node scripts/sync-pe-schema.cjs || echo "WARNING: PE schema sync failed; continuing build."
fi

exec npx next build
