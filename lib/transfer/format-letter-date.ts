import type { TransferLetterType } from "@/lib/generated/prisma/client";

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatTransferLetterDate(date: Date | string, type: TransferLetterType): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";

  const day = parsed.getUTCDate();
  const month = parsed.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  const year = parsed.getUTCFullYear();

  if (type === "UK") {
    const paddedDay = String(day).padStart(2, "0");
    return `${paddedDay} ${month} ${year}`;
  }

  const dayWithSuffix = `${day}${ordinalSuffix(day)}`;
  if (type === "INTERNATIONAL" || type === "USA") {
    return `${month} ${dayWithSuffix}, ${year}`;
  }

  return `${month} ${dayWithSuffix} ${year}`;
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInputToUtc(dateValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}
