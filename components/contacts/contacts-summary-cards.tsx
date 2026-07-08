import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectoryContactListRow } from "@/lib/actions/contacts";

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ContactsSummaryCards({ contacts }: { contacts: DirectoryContactListRow[] }) {
  const active = contacts.filter((c) => c.isActive);
  const followUpsDue = contacts.filter((c) => c.followUpDue || c.followUpOverdue);
  const byType = new Set(active.map((c) => c.contactType));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Active Contacts"
        value={active.length.toString()}
        detail={`${contacts.length} total on record`}
      />
      <SummaryMetric
        label="Follow-ups Due"
        value={followUpsDue.length.toString()}
        detail="Within 14 days or overdue"
      />
      <SummaryMetric
        label="Inactive"
        value={contacts.filter((c) => !c.isActive).length.toString()}
        detail="Archived or no longer relevant"
      />
      <SummaryMetric
        label="Contact Types"
        value={byType.size.toString()}
        detail="Bankers, lawyers, advisors, and more"
      />
    </div>
  );
}
