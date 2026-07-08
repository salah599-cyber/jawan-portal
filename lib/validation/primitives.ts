import { z } from "zod";

/**
 * Shared Zod building blocks for parsing raw `FormData` string values into
 * validated, typed inputs before they reach Prisma. Centralizing these here
 * ensures every module rejects invalid enums, malformed numbers/dates, and
 * out-of-range percentages consistently instead of relying on ad hoc
 * `String(formData.get(...))` casts.
 */

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function zRequiredString(label: string) {
  return z.string().trim().min(1, `${label} is required.`);
}

export function zOptionalString() {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));
}

export function zRequiredDecimal(label: string, opts?: { min?: number; max?: number }) {
  let schema = z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => DECIMAL_PATTERN.test(v), `${label} must be a valid number.`);

  if (opts?.min !== undefined) {
    const min = opts.min;
    schema = schema.refine((v) => !DECIMAL_PATTERN.test(v) || Number(v) >= min, `${label} must be at least ${min}.`);
  }
  if (opts?.max !== undefined) {
    const max = opts.max;
    schema = schema.refine((v) => !DECIMAL_PATTERN.test(v) || Number(v) <= max, `${label} must be at most ${max}.`);
  }
  return schema;
}

export function zOptionalDecimal(label: string, opts?: { min?: number; max?: number }) {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => v === undefined || DECIMAL_PATTERN.test(v), `${label} must be a valid number.`)
    .refine(
      (v) => v === undefined || opts?.min === undefined || Number(v) >= opts.min,
      `${label} must be at least ${opts?.min}.`,
    )
    .refine(
      (v) => v === undefined || opts?.max === undefined || Number(v) <= opts.max,
      `${label} must be at most ${opts?.max}.`,
    );
}

export function zRequiredDate(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), `${label} must be a valid date.`)
    .transform((v) => new Date(v));
}

export function zOptionalDate(label: string) {
  return z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => v === undefined || !Number.isNaN(new Date(v).getTime()), `${label} must be a valid date.`)
    .transform((v) => (v === undefined ? undefined : new Date(v)));
}

/** Validates a raw string against a known set of Prisma enum values with a friendly error. */
export function assertEnumValue<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as T;
}

export function firstZodIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

/** Runs `schema.safeParse` and throws a plain `Error` with the first validation message on failure. */
export function parseOrThrow<Schema extends z.ZodTypeAny>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(firstZodIssueMessage(result.error));
  }
  return result.data;
}

/** Validates that a list of ownership percentages sums to at most 100%. */
export function assertOwnershipPercentagesValid(
  percentages: (string | undefined)[],
  label = "Ownership percentages",
) {
  const total = percentages.reduce((sum, pct) => {
    if (!pct) return sum;
    const n = Number(pct);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
  if (total > 100.001) {
    throw new Error(`${label} cannot exceed 100% in total (currently ${total.toFixed(2)}%).`);
  }
}
