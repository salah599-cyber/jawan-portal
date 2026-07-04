import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { ContactDetail } from "@/components/contacts/contact-detail";
import { deleteDirectoryContact, getDirectoryContact } from "@/lib/actions/contacts";
import { serializeDirectoryContact } from "@/lib/contacts/serialize";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CONTACTS");
  const contact = await getDirectoryContact(id);
  if (!contact) notFound();

  const serialized = serializeDirectoryContact(contact);
  const canEdit = canWrite(ctx, "CONTACTS");

  return (
    <>
      <PlatformHeader title={contact.fullName} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contacts">Back to Directory</Link>
          </Button>
          {canEdit ? (
            <>
              <EditLinkButton href={`/contacts/${contact.id}/edit`} />
              <DeleteEntryButton
                itemId={contact.id}
                itemLabel={contact.fullName}
                deleteAction={deleteDirectoryContact}
                redirectTo="/contacts"
                title="Delete contact?"
                description="This will permanently remove this contact from the directory."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {DIRECTORY_CONTACT_TYPE_LABELS[contact.contactType] ?? contact.contactType}
          </Badge>
          <Badge variant={contact.isActive ? "default" : "secondary"}>
            {contact.isActive ? "Active" : "Inactive"}
          </Badge>
          {contact.organization ? (
            <span className="text-sm text-muted-foreground">{contact.organization}</span>
          ) : null}
        </div>

        <ContactDetail contact={serialized} />
      </main>
    </>
  );
}
