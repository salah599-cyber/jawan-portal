import { randomUUID } from "crypto";
import type { Client } from "pg";

export async function backfillPublicBrokerAccounts(client: Client) {
  const pending = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM "PublicEquityHolding"
    WHERE "source" = 'IMPORT'
      AND "brokerAccountId" IS NULL
      AND "broker" IS NOT NULL
  `);

  if (Number(pending.rows[0]?.count ?? 0) === 0) {
    return;
  }

  const groups = await client.query<{
    entityId: string;
    broker: string;
    accountNumber: string | null;
  }>(`
    SELECT DISTINCT
      a."entityId" AS "entityId",
      h."broker" AS broker,
      h."accountNumber" AS "accountNumber"
    FROM "PublicEquityHolding" h
    JOIN "Asset" a ON a.id = h."assetId"
    WHERE h."source" = 'IMPORT'
      AND h."broker" IS NOT NULL
      AND h."brokerAccountId" IS NULL
  `);

  for (const group of groups.rows) {
    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM "PublicBrokerAccount"
        WHERE "entityId" = $1
          AND broker = $2
          AND (
            ("accountNumber" IS NULL AND $3::text IS NULL)
            OR "accountNumber" = $3
          )
        LIMIT 1
      `,
      [group.entityId, group.broker, group.accountNumber],
    );

    let brokerAccountId = existing.rows[0]?.id;
    if (!brokerAccountId) {
      brokerAccountId = randomUUID();
      await client.query(
        `
          INSERT INTO "PublicBrokerAccount" (
            id, "entityId", broker, "accountNumber", "isManaged", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        `,
        [brokerAccountId, group.entityId, group.broker, group.accountNumber],
      );
    }

    await client.query(
      `
        UPDATE "PublicEquityHolding" h
        SET "brokerAccountId" = $1, "isManaged" = true
        FROM "Asset" a
        WHERE h."assetId" = a.id
          AND a."entityId" = $2
          AND h.broker = $3
          AND (
            (h."accountNumber" IS NULL AND $4::text IS NULL)
            OR h."accountNumber" = $4
          )
          AND h."source" = 'IMPORT'
          AND h."brokerAccountId" IS NULL
      `,
      [brokerAccountId, group.entityId, group.broker, group.accountNumber],
    );

    await client.query(
      `
        UPDATE "ImportBatch" b
        SET "brokerAccountId" = $1, "isManaged" = true
        WHERE b."brokerAccountId" IS NULL
          AND b.broker = $2
          AND (
            (b."accountNumber" IS NULL AND $3::text IS NULL)
            OR b."accountNumber" = $3
          )
      `,
      [brokerAccountId, group.broker, group.accountNumber],
    );
  }
}
