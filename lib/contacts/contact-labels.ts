export const CONTACT_EMAIL_LABEL_PRESETS = [
  "Work",
  "Personal",
  "Assistant",
  "Billing",
] as const;

export const CONTACT_PHONE_LABEL_PRESETS = [
  "Mobile",
  "Office",
  "WhatsApp",
  "Fax",
  "Home",
] as const;

export const CUSTOM_CONTACT_LABEL = "__custom__";

export function isPresetLabel(
  label: string | undefined,
  presets: readonly string[],
): boolean {
  return Boolean(label && presets.includes(label));
}
