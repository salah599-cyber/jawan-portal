import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { ContactsSummaryCards } from "@/components/contacts/contacts-summary-cards";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsFilters } from "@/components/contacts/contacts-filters";
import { listDirectoryContacts } from "@/lib/actions/contacts";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContactsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    type?: string;
    active?: string;
    followUp?: string;
  }>;
}) {
  const { entity: entityParam, type: typeParam, active: activeParam, followUp: followUpParam } =
    await searchParams;
  const ctx = await requireModuleAccess("CONTACTS");

  const entities = await listEntities();
  const entityId =
    entityParam === "global"
      ? "__global__"
      : entityParam && entities.some((e) => e.id === entityParam)
        ? entityParam
        : undefined;
  const activeOnly = activeParam !== "all";
  const followUpDue = followUpParam === "due";

  const contacts = await listDirectoryContacts({
    entityId,
    contactType: typeParam,
    activeOnly,
    followUpDue,
  });

  const canEdit = canWrite(ctx, "CONTACTS");

  return (
    <>
      <PlatformHeader title="Contacts Directory" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Contacts Directory</h2>
            <p className="text-sm text-muted-foreground">
              Central register of bankers, lawyers, fund managers, brokers, and other external parties.
            </p>
          </div>
          {canEdit ? <AddLinkButton href="/contacts/new" label="Add Contact" /> : null}
        </div>

        <ContactsSummaryCards contacts={contacts} />

        <ContactsFilters
          entityId={entityParam === "global" ? "__global__" : entityId}
          entities={entities}
          typeParam={typeParam}
          activeOnly={activeOnly}
          followUpDue={followUpDue}
          currentParams={{
            entity: entityParam,
            type: typeParam,
            active: activeOnly ? undefined : "all",
            followUp: followUpDue ? "due" : undefined,
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              {contacts.length} contact{contacts.length === 1 ? "" : "s"} on record
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContactsTable contacts={contacts} canEdit={canEdit} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
