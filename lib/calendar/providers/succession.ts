import { db } from "@/lib/db";
import { ensureFamilySchema } from "@/lib/db/ensure-family-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { successionPlanFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";
import { SUCCESSION_PATH } from "@/lib/family/constants";

export async function getSuccessionCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "SUCCESSION")) return [];

  await ensureFamilySchema();

  const now = new Date();
  const horizon = addDays(now, 90);

  const plans = await db.successionPlan.findMany({
    where: {
      ...successionPlanFilter(ctx),
      status: { not: "COMPLETE" },
      nextReviewDate: { not: null, lte: horizon },
    },
    include: {
      entity: { select: { name: true } },
    },
    take: 50,
    orderBy: { nextReviewDate: "asc" },
  });

  return plans
    .filter((plan) => plan.nextReviewDate)
    .map((plan) =>
      buildSystemItem({
        id: `system:succession-review:${plan.id}`,
        kind: "SUCCESSION_REVIEW_DUE",
        module: "SUCCESSION",
        title: plan.title,
        subtitle: plan.entity ? `Review due · ${plan.entity.name}` : "Estate plan review due",
        date: plan.nextReviewDate!,
        href: `${SUCCESSION_PATH}/${plan.id}`,
        entityId: plan.entityId,
        entityName: plan.entity?.name,
      }),
    );
}
