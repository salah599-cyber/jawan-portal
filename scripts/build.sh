#!/usr/bin/env bash
set -euo pipefail

# Sync PE tables with raw SQL (no Prisma Migrate) so Vercel never hits P3005.
DB_URL="${POSTGRES_URL_NON_POOLING:-${POSTGRES_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-${POSTGRES_PRISMA_URL:-}}}}}"
if [ -n "$DB_URL" ]; then
  node scripts/sync-pe-schema.cjs || echo "WARNING: PE schema sync failed during build; runtime sync will retry."
  node scripts/sync-public-markets-schema.cjs || echo "WARNING: Public markets schema sync failed during build; runtime sync will retry."
  node scripts/sync-real-estate-schema.cjs || echo "WARNING: Real estate schema sync failed during build; runtime sync will retry."
  node scripts/sync-asset-types-schema.cjs || echo "WARNING: Asset types schema sync failed during build; runtime sync will retry."
  node scripts/sync-cash-management-schema.cjs || echo "WARNING: Cash management schema sync failed during build; runtime sync will retry."
  node scripts/sync-calendar-schema.cjs || echo "WARNING: Calendar schema sync failed during build; runtime sync will retry."
  node scripts/sync-lp-fund-schema.cjs || echo "WARNING: LP fund schema sync failed during build; runtime sync will retry."
  node scripts/sync-insurance-schema.cjs || echo "WARNING: Insurance schema sync failed during build; runtime sync will retry."
  node scripts/sync-family-schema.cjs || echo "WARNING: Family schema sync failed during build; runtime sync will retry."
  node scripts/sync-contacts-schema.cjs || echo "WARNING: Contacts schema sync failed during build; runtime sync will retry."
fi

exec npx next build
