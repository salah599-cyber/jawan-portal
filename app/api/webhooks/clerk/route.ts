import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth/constants";
import { applyPendingInvite } from "@/lib/auth/apply-invite";
import { hasInviteAccess } from "@/lib/auth/invite-access";

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req);

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const clerkId = event.data.id;
        const email =
          event.data.email_addresses?.[0]?.email_address ??
          event.data.primary_email_address_id
            ? event.data.email_addresses?.find(
                (e) => e.id === event.data.primary_email_address_id,
              )?.email_address
            : undefined;

        if (!email) break;

        const existingDbUser = await db.user.findUnique({ where: { clerkId } });
        if (!existingDbUser && !(await hasInviteAccess(email))) {
          break;
        }

        const isBootstrap = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

        const user = await db.user.upsert({
          where: { clerkId },
          create: {
            clerkId,
            email,
            firstName: event.data.first_name,
            lastName: event.data.last_name,
            role: isBootstrap ? "PRINCIPAL" : "EXTERNAL",
            isSuperAdmin: isBootstrap,
            isActive: true,
          },
          update: {
            email,
            firstName: event.data.first_name,
            lastName: event.data.last_name,
            ...(isBootstrap
              ? { isSuperAdmin: true, role: "PRINCIPAL" as const, isActive: true }
              : {}),
          },
        });

        await applyPendingInvite(user.id, email);
        break;
      }
      case "user.deleted": {
        const clerkId = event.data.id;
        await db.user.updateMany({
          where: { clerkId },
          data: { isActive: false },
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }
}
