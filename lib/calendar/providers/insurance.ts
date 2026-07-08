import { db } from "@/lib/db";
import { ensureInsuranceSchema } from "@/lib/db/ensure-insurance-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { insurancePolicyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";
import { INSURANCE_PATH } from "@/lib/insurance/constants";
import { resolvePolicyStatus } from "@/lib/insurance/helpers";

export async function getInsuranceCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "INSURANCE")) return [];

  await ensureInsuranceSchema();

  const now = new Date();
  const horizon = addDays(now, 30);

  const policies = await db.insurancePolicy.findMany({
    where: {
      ...insurancePolicyEntityFilter(ctx),
      status: { not: "CANCELLED" },
      OR: [
        { expiryDate: { not: null, lte: horizon } },
        { renewalDate: { not: null, lte: horizon } },
      ],
    },
    include: {
      entity: { select: { name: true } },
    },
    take: 50,
    orderBy: { expiryDate: "asc" },
  });

  const items: CalendarItem[] = [];

  for (const policy of policies) {
    const effectiveStatus = resolvePolicyStatus(policy.status, policy.expiryDate);

    if (policy.expiryDate && policy.expiryDate <= horizon) {
      items.push(
        buildSystemItem({
          id: `system:insurance-expiry:${policy.id}`,
          kind: "INSURANCE_EXPIRY",
          module: "INSURANCE",
          title: policy.policyNumber,
          subtitle: `${policy.insurer} · Expiry · ${policy.entity.name}`,
          date: policy.expiryDate,
          href: `${INSURANCE_PATH}/${policy.id}`,
          entityId: policy.entityId,
          entityName: policy.entity?.name,
        }),
      );
    }

    if (
      policy.renewalDate &&
      policy.renewalDate <= horizon &&
      policy.renewalDate.getTime() !== policy.expiryDate?.getTime()
    ) {
      items.push(
        buildSystemItem({
          id: `system:insurance-renewal:${policy.id}`,
          kind: "INSURANCE_EXPIRY",
          module: "INSURANCE",
          title: policy.policyNumber,
          subtitle: `${policy.insurer} · Renewal · ${policy.entity.name}`,
          date: policy.renewalDate,
          href: `${INSURANCE_PATH}/${policy.id}`,
          entityId: policy.entityId,
          entityName: policy.entity?.name,
        }),
      );
    }

    if (effectiveStatus === "EXPIRED" && policy.expiryDate) {
      // expiry item already added above
    }
  }

  return items;
}
