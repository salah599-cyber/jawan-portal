import { db } from "@/lib/db";

const DEFAULT_ENTITY_NAME = "Jawan Investments";

export async function ensureDefaultEntity() {
  const existing = await db.entity.findFirst({
    where: { name: DEFAULT_ENTITY_NAME },
  });
  if (existing) return existing;

  const anyEntity = await db.entity.findFirst();
  if (anyEntity) return anyEntity;

  return db.entity.create({
    data: { name: DEFAULT_ENTITY_NAME },
  });
}

export async function listEntities() {
  await ensureDefaultEntity();
  return db.entity.findMany({ orderBy: { name: "asc" } });
}
