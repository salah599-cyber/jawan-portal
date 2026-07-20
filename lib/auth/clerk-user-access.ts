import { clerkClient } from "@clerk/nextjs/server";

async function revokeActiveSessions(clerkId: string) {
  const clerk = await clerkClient();
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await clerk.sessions.getSessionList({
      userId: clerkId,
      status: "active",
      limit,
      offset,
    });

    for (const session of page.data) {
      try {
        await clerk.sessions.revokeSession(session.id);
      } catch {
        // Session may already be revoked.
      }
    }

    if (page.data.length < limit) break;
    offset += limit;
  }
}

export async function suspendClerkUser(clerkId: string | null | undefined) {
  if (!clerkId) return;

  const clerk = await clerkClient();
  try {
    await revokeActiveSessions(clerkId);
    await clerk.users.banUser(clerkId);
  } catch {
    // User may not exist in Clerk yet.
  }
}

export async function restoreClerkUser(clerkId: string | null | undefined) {
  if (!clerkId) return;

  const clerk = await clerkClient();
  try {
    await clerk.users.unbanUser(clerkId);
  } catch {
    // User may not exist in Clerk.
  }
}
