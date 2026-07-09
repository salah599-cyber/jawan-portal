import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isBootstrapSuperAdminEmail } from "@/lib/auth/constants";
import { applyPendingInvite } from "@/lib/auth/apply-invite";
import { hasInviteAccess } from "@/lib/auth/invite-access";

function getWebhookSigningSecret() {
  return (
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? process.env.CLERK_WEBHOOK_SECRET
  );
}

export async function POST(req: NextRequest) {
  try {
    const signingSecret = getWebhookSigningSecret();
    const event = await verifyWebhook(
      req,
      signingSecret ? { signingSecret } : undefined,
    );

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const clerkId = event.data.id;
        const primaryEmail = event.data.email_addresses?.find(
          (e) => e.id === event.data.primary_email_address_id,
        )?.email_address;
        const email = primaryEmail ?? event.data.email_addresses?.[0]?.email_address;

        if (!email) break;

        const normalizedEmail = email.trim().toLowerCase();
        const existingByClerk = await db.user.findUnique({ where: { clerkId } });
        const existingByEmail = await db.user.findUnique({ where: { email: normalizedEmail } });

        if (!existingByClerk && !existingByEmail && !(await hasInviteAccess(normalizedEmail))) {
          break;
        }

        const isBootstrap = isBootstrapSuperAdminEmail(normalizedEmail);
        const profileData = {
          email: normalizedEmail,
          firstName: event.data.first_name,
          lastName: event.data.last_name,
          ...(isBootstrap
            ? { isSuperAdmin: true, role: "PRINCIPAL" as const, isActive: true }
            : {}),
        };

        const user = existingByEmail
          ? await db.user.update({
              where: { id: existingByEmail.id },
              data: { clerkId, ...profileData },
            })
          : await db.user.upsert({
              where: { clerkId },
              create: {
                clerkId,
                ...profileData,
                role: isBootstrap ? "PRINCIPAL" : "EXTERNAL",
                isSuperAdmin: isBootstrap,
                isActive: true,
              },
              update: profileData,
            });

        await applyPendingInvite(user.id, normalizedEmail);
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
