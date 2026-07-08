import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  isIgnorablePrivateReSchemaError,
  PRIVATE_RE_DOCUMENT_ENUM_STATEMENTS,
  PRIVATE_RE_ENUM_STATEMENTS,
  PRIVATE_RE_SCHEMA_COLUMN_CHECK_SQL,
  PRIVATE_RE_SCHEMA_STATEMENTS,
} from "@/lib/db/real-estate-private-schema-statements";

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

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

function isIgnorableSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client: Client, tableName: string) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    )`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function privateReColumnExists(client: Client): Promise<boolean> {
  const result = await client.query(PRIVATE_RE_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function runStatements(client: Client, statements: string[], ignorable = isIgnorableSchemaError) {
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (ignorable(message)) continue;
      throw new Error(`Real estate schema statement failed: ${message}`);
    }
  }
}

async function applyBaseRealEstateSchema(client: Client) {
  if (await tableExists(client, "ReProperty")) {
    return;
  }

  const sqlPath = path.join(process.cwd(), "lib/db/real-estate-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableSchemaError(message)) continue;
      throw new Error(`Real estate schema statement failed: ${message}`);
    }
  }

  if (!(await tableExists(client, "ReProperty"))) {
    throw new Error("Real estate schema sync finished but ReProperty table is still missing.");
  }
}

async function applyPrivateRealEstateSchema(client: Client) {
  if (!(await tableExists(client, "ReProperty"))) {
    return;
  }

  if (await privateReColumnExists(client)) {
    return;
  }

  await runStatements(client, PRIVATE_RE_ENUM_STATEMENTS, isIgnorablePrivateReSchemaError);
  await runStatements(client, PRIVATE_RE_DOCUMENT_ENUM_STATEMENTS, isIgnorablePrivateReSchemaError);
  await runStatements(client, PRIVATE_RE_SCHEMA_STATEMENTS, isIgnorablePrivateReSchemaError);

  if (!(await privateReColumnExists(client))) {
    throw new Error(
      "Private real estate schema sync finished but ReProperty.portfolioTrack is still missing.",
    );
  }
}

async function applyRealEstateSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await applyBaseRealEstateSchema(client);
    await applyPrivateRealEstateSchema(client);
  } finally {
    await client.end();
  }
}

export function ensureRealEstateSchema() {
  if (!ensurePromise) {
    ensurePromise = applyRealEstateSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
