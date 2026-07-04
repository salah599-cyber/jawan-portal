import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateContactForm } from "@/components/contacts/create-contact-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewContactPage() {
  const ctx = await requireModuleAccess("CONTACTS");
  if (!canWrite(ctx, "CONTACTS")) forbidden();
  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Contact" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateContactForm entities={entities} />
      </main>
    </>
  );
}
