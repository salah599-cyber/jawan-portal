import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

export const TOTP_ISSUER = "Jawan Investments";
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_WINDOW = 1;
export const TOTP_BACKUP_CODE_COUNT = 10;
export const TOTP_MAX_FAILED_ATTEMPTS = 8;
export const TOTP_LOCK_MS = 15 * 60 * 1000;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function totpKeyMaterial() {
  return process.env.TOTP_ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY || "";
}

export function totpCryptoKey() {
  const material = totpKeyMaterial();
  if (!material) {
    throw new Error("TOTP_ENCRYPTION_KEY or CLERK_SECRET_KEY is required to encrypt authenticator secrets.");
  }
  return createHash("sha256").update(`jawan-totp-secret:${material}`).digest();
}

export function totpCookieKey() {
  const material = totpKeyMaterial();
  if (!material) {
    throw new Error("TOTP_ENCRYPTION_KEY or CLERK_SECRET_KEY is required to sign the TOTP session cookie.");
  }
  return createHash("sha256").update(`jawan-totp-cookie:${material}`).digest();
}

export function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(input: string) {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid authenticator secret.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function hotp(secret: Buffer, counter: bigint, digits = TOTP_DIGITS) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totpAt(secret: Buffer, unixSeconds: number, period = TOTP_PERIOD_SECONDS) {
  return hotp(secret, BigInt(Math.floor(unixSeconds / period)));
}

export function normalizeTotpCode(code: string) {
  return code.replace(/\s+/g, "");
}

export function verifyTotpCode(secretBase32: string, code: string, nowMs = Date.now()) {
  const expected = normalizeTotpCode(code);
  if (!/^\d{6}$/.test(expected)) return false;

  const secret = decodeBase32(secretBase32);
  const unixSeconds = Math.floor(nowMs / 1000);

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const candidate = totpAt(secret, unixSeconds + offset * TOTP_PERIOD_SECONDS);
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }

  return false;
}

export function totpAuthUrl(secretBase32: string, accountName: string, issuer = TOTP_ISSUER) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function encryptSecret(plain: string, key = totpCryptoKey()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string, key = totpCryptoKey()) {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Invalid encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

export function generateBackupCodes(count = TOTP_BACKUP_CODE_COUNT) {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(randomBytes(5).toString("hex").slice(0, 10).toUpperCase());
  }
  return codes;
}

export function hashBackupCode(code: string) {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function normalizeBackupCode(code: string) {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function verifyBackupCode(hashes: string[], code: string) {
  const hashed = hashBackupCode(code);
  const match = hashes.find((stored) => {
    const a = Buffer.from(stored);
    const b = Buffer.from(hashed);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  return match ?? null;
}

export function parseBackupCodeHashes(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
