"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { MFA_ENROLL_PATH } from "@/lib/auth/mfa";
import {
  TOTP_LOCK_MS,
  TOTP_MAX_FAILED_ATTEMPTS,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  parseBackupCodeHashes,
  totpAuthUrl,
  verifyBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { encodeTotpCookie, TOTP_COOKIE, totpCookieOptions } from "@/lib/auth/totp-cookie";

type TotpFields = {
  totpEnabled: boolean;
  totpSecretEncrypted: string | null;
  totpPendingSecretEncrypted: string | null;
  totpBackupCodeHashes: string | null;
  totpFailedAttempts: number;
  totpLockedUntil: Date | null;
};

async function requireClerkSession() {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) redirect("/sign-in");
  return { userId, sessionId };
}

async function loadUser(clerkId: string) {
  await ensureUsersSchema();
  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "";

  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      email: true,
      totpEnabled: true,
      totpSecretEncrypted: true,
      totpPendingSecretEncrypted: true,
      totpBackupCodeHashes: true,
      totpFailedAttempts: true,
      totpLockedUntil: true,
    },
  });

  if (!user) {
    redirect("/invite-required");
  }

  return { user, email: user.email || email };
}

function lockMessage(lockedUntil: Date | null) {
  if (!lockedUntil || lockedUntil.getTime() <= Date.now()) return null;
  const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
  return `Too many incorrect codes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function recordFailure(userId: string, fields: TotpFields) {
  const failed = fields.totpFailedAttempts + 1;
  const lockedUntil =
    failed >= TOTP_MAX_FAILED_ATTEMPTS ? new Date(Date.now() + TOTP_LOCK_MS) : fields.totpLockedUntil;
  await db.user.update({
    where: { id: userId },
    data: {
      totpFailedAttempts: failed,
      totpLockedUntil: lockedUntil,
    },
  });
  return lockMessage(lockedUntil) ?? "That code is incorrect. Try again.";
}

async function markVerified(dbUserId: string, clerkUserId: string, sessionId: string) {
  await db.user.update({
    where: { id: dbUserId },
    data: { totpFailedAttempts: 0, totpLockedUntil: null },
  });
  (await cookies()).set(TOTP_COOKIE, encodeTotpCookie(clerkUserId, sessionId), totpCookieOptions());
}

export async function startTotpEnrollment(): Promise<
  { ok: true; qrDataUrl: string; secret: string; otpauthUrl: string } | { ok: false; error: string }
> {
  try {
    const { userId } = await requireClerkSession();
    await syncClerkUser();
    const { user, email } = await loadUser(userId);
    if (user.totpEnabled) {
      return { ok: false, error: "Authenticator is already enrolled. Enter a code to continue." };
    }

    let secret: string;
    if (user.totpPendingSecretEncrypted) {
      secret = decryptSecret(user.totpPendingSecretEncrypted);
    } else {
      secret = generateTotpSecret();
      await db.user.update({
        where: { id: user.id },
        data: { totpPendingSecretEncrypted: encryptSecret(secret) },
      });
    }

    const otpauthUrl = totpAuthUrl(secret, email || "user");
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
    return { ok: true as const, qrDataUrl, secret, otpauthUrl };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not start authenticator setup.",
    };
  }
}

async function qrForSecret(secret: string, email: string) {
  const otpauthUrl = totpAuthUrl(secret, email || "user");
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { qrDataUrl, secret, otpauthUrl };
}

export async function revealExistingTotp(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { userId } = await requireClerkSession();
  await syncClerkUser();
  const { user, email } = await loadUser(userId);

  if (!user.totpEnabled || !user.totpSecretEncrypted) {
    return { error: "This account does not have Google Authenticator yet. Set it up first." };
  }

  const locked = lockMessage(user.totpLockedUntil);
  if (locked) return { error: locked };

  const secret = decryptSecret(user.totpSecretEncrypted);
  if (!verifyTotpCode(secret, code)) {
    return { error: await recordFailure(user.id, user) };
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpFailedAttempts: 0, totpLockedUntil: null },
  });

  return { ok: true as const, ...(await qrForSecret(secret, email)) };
}

export async function startTotpReplacement(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { userId } = await requireClerkSession();
  await syncClerkUser();
  const { user, email } = await loadUser(userId);

  if (!user.totpEnabled || !user.totpSecretEncrypted) {
    return { error: "Set up Google Authenticator before replacing it." };
  }

  const locked = lockMessage(user.totpLockedUntil);
  if (locked) return { error: locked };

  const currentSecret = decryptSecret(user.totpSecretEncrypted);
  const hashes = parseBackupCodeHashes(user.totpBackupCodeHashes);
  const totpOk = verifyTotpCode(currentSecret, code);
  const matchedBackup = totpOk ? null : verifyBackupCode(hashes, code);
  if (!totpOk && !matchedBackup) {
    return { error: await recordFailure(user.id, user) };
  }

  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: user.id },
    data: {
      totpPendingSecretEncrypted: encryptSecret(secret),
      totpBackupCodeHashes: matchedBackup
        ? JSON.stringify(hashes.filter((hash) => hash !== matchedBackup))
        : user.totpBackupCodeHashes,
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    },
  });

  return { ok: true as const, ...(await qrForSecret(secret, email)) };
}

export async function confirmTotpReplacement(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { userId, sessionId } = await requireClerkSession();
  await syncClerkUser();
  const { user } = await loadUser(userId);

  if (!user.totpPendingSecretEncrypted) {
    return { error: "Scan the new QR code first, then enter the 6-digit code." };
  }

  const locked = lockMessage(user.totpLockedUntil);
  if (locked) return { error: locked };

  const pendingSecret = decryptSecret(user.totpPendingSecretEncrypted);
  if (!verifyTotpCode(pendingSecret, code)) {
    return { error: await recordFailure(user.id, user) };
  }

  const backupCodes = generateBackupCodes();
  await db.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpSecretEncrypted: encryptSecret(pendingSecret),
      totpPendingSecretEncrypted: null,
      totpBackupCodeHashes: JSON.stringify(backupCodes.map(hashBackupCode)),
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    },
  });

  await markVerified(user.id, userId, sessionId);
  return { backupCodes };
}

export async function confirmTotpEnrollment(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { userId, sessionId } = await requireClerkSession();
  const { user } = await loadUser(userId);

  if (user.totpEnabled) {
    return { error: "Authenticator is already enrolled." };
  }

  const locked = lockMessage(user.totpLockedUntil);
  if (locked) return { error: locked };

  if (!user.totpPendingSecretEncrypted) {
    return { error: "Scan the QR code first, then enter the 6-digit code." };
  }

  const pendingSecret = decryptSecret(user.totpPendingSecretEncrypted);
  if (!verifyTotpCode(pendingSecret, code)) {
    return { error: await recordFailure(user.id, user) };
  }

  const backupCodes = generateBackupCodes();
  await db.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpSecretEncrypted: encryptSecret(pendingSecret),
      totpPendingSecretEncrypted: null,
      totpBackupCodeHashes: JSON.stringify(backupCodes.map(hashBackupCode)),
      totpFailedAttempts: 0,
      totpLockedUntil: null,
    },
  });

  await markVerified(user.id, userId, sessionId);
  return { backupCodes };
}

export async function verifyTotpChallenge(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { userId, sessionId } = await requireClerkSession();
  const { user } = await loadUser(userId);

  if (!user.totpEnabled || !user.totpSecretEncrypted) {
    redirect(MFA_ENROLL_PATH);
  }

  const locked = lockMessage(user.totpLockedUntil);
  if (locked) return { error: locked };

  const secret = decryptSecret(user.totpSecretEncrypted);
  if (verifyTotpCode(secret, code)) {
    await markVerified(user.id, userId, sessionId);
    redirect("/dashboard");
  }

  const hashes = parseBackupCodeHashes(user.totpBackupCodeHashes);
  const matched = verifyBackupCode(hashes, code);
  if (matched) {
    await db.user.update({
      where: { id: user.id },
      data: {
        totpBackupCodeHashes: JSON.stringify(hashes.filter((hash) => hash !== matched)),
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      },
    });
    (await cookies()).set(TOTP_COOKIE, encodeTotpCookie(userId, sessionId), totpCookieOptions());
    redirect("/dashboard");
  }

  return { error: await recordFailure(user.id, user) };
}

export async function requireTotpDestination() {
  const { userId, sessionId } = await requireClerkSession();
  await syncClerkUser();
  const { user } = await loadUser(userId);
  return { userId, sessionId, enrolled: user.totpEnabled };
}
