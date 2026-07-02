#!/usr/bin/env bash
set -euo pipefail

# Neon/Vercel: use a direct (non-pooled) URL for schema changes.
DB_URL="${POSTGRES_URL_NON_POOLING:-${POSTGRES_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}}"

if [ -n "$DB_URL" ]; then
  export DATABASE_URL="$DB_URL"
  echo "Syncing database schema with prisma db push..."
  if ! npx prisma db push --skip-generate; then
    echo "WARNING: prisma db push failed. Continuing build; run 'npm run db:push' manually if needed."
  fi
else
  echo "Skipping database schema sync (no database URL available at build time)."
fi

npx next build
