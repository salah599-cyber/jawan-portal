export function parseImportOptionsFromFormData(formData: FormData) {
  const brokerAccountId = String(formData.get("brokerAccountId") ?? "").trim();
  const isManagedRaw = formData.get("isManaged");

  let isManaged: boolean | null = null;
  if (isManagedRaw === "true") isManaged = true;
  if (isManagedRaw === "false") isManaged = false;

  return { brokerAccountId, isManaged };
}
