/**
 * One-time migration: split LandParcel.registeredHolder into LandRegisteredHolder rows.
 * Run after `npm run db:push` when upgrading an existing database:
 *   node scripts/migrate-land-holders.cjs
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");
const { randomBytes } = require("crypto");

function cuid() {
  return "c" + randomBytes(12).toString("hex");
}

function splitHolderNames(value) {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName],
  );
  return result.rows[0].exists;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const hasHolderTable = await tableExists(client, "LandRegisteredHolder");
    if (!hasHolderTable) {
      console.error("LandRegisteredHolder table not found. Run `npm run db:push` first.");
      process.exit(1);
    }

    const parcels = await client.query(`
      SELECT lp.id, lp."registeredHolder"
      FROM "LandParcel" lp
      WHERE lp."registeredHolder" IS NOT NULL
        AND TRIM(lp."registeredHolder") <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "LandRegisteredHolder" h WHERE h."landParcelId" = lp.id
        )
    `);

    if (parcels.rows.length === 0) {
      console.log("No land parcels need holder migration.");
      return;
    }

    await client.query("BEGIN");

    let created = 0;
    for (const parcel of parcels.rows) {
      const names = splitHolderNames(parcel.registeredHolder);
      for (let i = 0; i < names.length; i++) {
        await client.query(
          `INSERT INTO "LandRegisteredHolder"
            ("id", "landParcelId", "name", "sortOrder", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [cuid(), parcel.id, names[i], i],
        );
        created++;
      }
    }

    await client.query("COMMIT");
    console.log(`Migrated ${parcels.rows.length} land parcel(s), created ${created} holder row(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
