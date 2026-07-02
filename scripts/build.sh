#!/usr/bin/env bash
set -euo pipefail

# Sync PE tables with raw SQL (no Prisma Migrate) so Vercel never hits P3005.
DB_URL="${POSTGRES_URL_NON_POOLING:-${POSTGRES_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-${POSTGRES_PRISMA_URL:-}}}}}"
if [ -n "$DB_URL" ]; then
  node scripts/sync-pe-schema.cjs || echo "WARNING: PE schema sync failed during build; runtime sync will retry."
  node scripts/sync-asset-schema.cjs || echo "WARNING: Asset schema sync failed during build; runtime sync will retry."
fi

exec npx next build
