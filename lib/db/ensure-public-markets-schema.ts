import { Client } from "pg";
import {
  isIgnorablePublicMarketsSchemaError,
  PUBLIC_MARKETS_ENUM_EXPANSION_STATEMENTS,
  PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL,
  PUBLIC_MARKETS_SCHEMA_STATEMENTS,
} from "@/lib/db/public-markets-schema-statements";
import {
  PUBLIC_CRYPTO_DETAIL_SCHEMA_STATEMENTS,
  PUBLIC_INSTRUMENTS_ENUM_EXPANSION_STATEMENTS,
  PUBLIC_INSTRUMENTS_SCHEMA_COLUMN_CHECK_SQL,
  PUBLIC_INSTRUMENTS_SCHEMA_STATEMENTS,
} from "@/lib/db/public-markets-instruments-schema-statements";
import {
  MANAGED_PORTFOLIO_SCHEMA_COLUMN_CHECK_SQL,
  MANAGED_PORTFOLIO_SCHEMA_STATEMENTS,
} from "@/lib/db/managed-portfolio-schema-statements";
import {
  backfillLegacyManagedPortfolios,
  normalizeImportedBrokerNames,
} from "@/lib/public-markets/backfill-managed-portfolios";

let ensurePromise: Promise<void> | null = null;

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

async function publicMarketsColumnExists(client: Client): Promise<boolean> {
  const result = await client.query(PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function instrumentsColumnExists(client: Client): Promise<boolean> {
  const result = await client.query(PUBLIC_INSTRUMENTS_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function runStatements(client: Client, statements: string[]) {
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorablePublicMarketsSchemaError(message)) continue;
      throw new Error(`Public markets schema statement failed: ${message}`);
    }
  }
}

async function managedPortfolioColumnExists(client: Client): Promise<boolean> {
  const result = await client.query(MANAGED_PORTFOLIO_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function applyPublicMarketsSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for public markets schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await runStatements(client, PUBLIC_MARKETS_ENUM_EXPANSION_STATEMENTS);

    if (!(await publicMarketsColumnExists(client))) {
      await runStatements(client, PUBLIC_MARKETS_SCHEMA_STATEMENTS);

      if (!(await publicMarketsColumnExists(client))) {
        throw new Error(
          "Public markets schema sync finished but PublicEquityHolding.priceFetchedAt is still missing.",
        );
      }
    }

    if (!(await instrumentsColumnExists(client))) {
      await runStatements(client, PUBLIC_INSTRUMENTS_SCHEMA_STATEMENTS);

      if (!(await instrumentsColumnExists(client))) {
        throw new Error(
          "Public markets instruments schema sync finished but PublicEquityHolding.instrumentType is still missing.",
        );
      }
    }

    await runStatements(client, PUBLIC_INSTRUMENTS_ENUM_EXPANSION_STATEMENTS);
    await runStatements(client, PUBLIC_CRYPTO_DETAIL_SCHEMA_STATEMENTS);

    if (!(await managedPortfolioColumnExists(client))) {
      await runStatements(client, MANAGED_PORTFOLIO_SCHEMA_STATEMENTS);

      if (!(await managedPortfolioColumnExists(client))) {
        throw new Error(
          "Managed portfolio schema sync finished but PublicEquityHolding.managedPortfolioId is still missing.",
        );
      }
    }

  } finally {
    await client.end();
  }

  await normalizeImportedBrokerNames();
  await backfillLegacyManagedPortfolios();
}

export function ensurePublicMarketsSchema() {
  if (!ensurePromise) {
    ensurePromise = applyPublicMarketsSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isPublicMarketsSchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await publicMarketsColumnExists(client);
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
