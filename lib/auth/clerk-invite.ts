import { clerkClient } from "@clerk/nextjs/server";

export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return undefined;
}

export function getClerkErrorMessage(error: unknown, fallback = "Request failed.") {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    const first = errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function revokePendingClerkInvitations(email: string) {
  try {
    const clerk = await clerkClient();
    const pending = await clerk.invitations.getInvitationList({
      query: email,
      status: "pending",
    });

    for (const invitation of pending.data) {
      try {
        await clerk.invitations.revokeInvitation(invitation.id);
      } catch {
        // Invitation may already be accepted or revoked.
      }
    }
  } catch {
    // Listing invitations can fail if Clerk is misconfigured; create may still work.
  }
}

export async function createClerkInvitation(email: string, pendingInviteId: string) {
  await revokePendingClerkInvitations(email);

  const clerk = await clerkClient();
  const baseUrl = getAppBaseUrl();
  try {
    return await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { pendingInviteId },
      ...(baseUrl ? { redirectUrl: `${baseUrl}/sign-in` } : {}),
    });
  } catch (error) {
    throw new Error(getClerkErrorMessage(error, "Failed to send Clerk invitation."));
  }
}
