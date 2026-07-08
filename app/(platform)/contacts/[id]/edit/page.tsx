import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditContactForm } from "@/components/contacts/edit-contact-form";
import { getDirectoryContact } from "@/lib/actions/contacts";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CONTACTS");
  if (!canWrite(ctx, "CONTACTS")) forbidden();

  const [contact, entities] = await Promise.all([
    getDirectoryContact(id),
    listEntities(),
  ]);
  if (!contact) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${contact.fullName}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditContactForm contact={contact} entities={entities} />
      </main>
    </>
  );
}
