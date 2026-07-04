import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { ContactsSummaryCards } from "@/components/contacts/contacts-summary-cards";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { listDirectoryContacts } from "@/lib/actions/contacts";
import { listEntities } from "@/lib/data/entities";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
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

  const buildHref = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = {
      entity: entityParam === "global" ? "global" : entityId && entityId !== "__global__" ? entityId : undefined,
      type: typeParam,
      active: activeOnly ? undefined : "all",
      followUp: followUpDue ? "due" : undefined,
      ...params,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/contacts?${qs}` : "/contacts";
  };

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

        <div className="flex flex-wrap gap-2">
          {entities.length > 1 ? (
            <>
              <Button variant={!entityId ? "default" : "outline"} size="sm" asChild>
                <Link href={buildHref({ entity: undefined })}>All entities</Link>
              </Button>
              <Button variant={entityId === "__global__" ? "default" : "outline"} size="sm" asChild>
                <Link href={buildHref({ entity: "global" })}>Global</Link>
              </Button>
              {entities.map((entity) => (
                <Button
                  key={entity.id}
                  variant={entity.id === entityId ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={buildHref({ entity: entity.id })}>{entity.name}</Link>
                </Button>
              ))}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Type:</span>
          <Button variant={!typeParam ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ type: undefined })}>All</Link>
          </Button>
          {Object.entries(DIRECTORY_CONTACT_TYPE_LABELS).map(([value, label]) => (
            <Button
              key={value}
              variant={typeParam === value ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildHref({ type: value })}>{label}</Link>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Filter:</span>
          <Button variant={activeOnly && !followUpDue ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ active: undefined, followUp: undefined })}>Active</Link>
          </Button>
          <Button variant={!activeOnly ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ active: "all", followUp: undefined })}>All statuses</Link>
          </Button>
          <Button variant={followUpDue ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ followUp: "due", active: "all" })}>Follow-up due</Link>
          </Button>
        </div>

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
