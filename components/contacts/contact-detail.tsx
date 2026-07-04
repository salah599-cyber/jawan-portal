import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedDirectoryContact } from "@/lib/contacts/serialize";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeDetailField } from "@/components/pe/pe-detail-field";

export function ContactDetail({ contact }: { contact: SerializedDirectoryContact }) {
  const location = [contact.city, contact.country].filter(Boolean).join(", ");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{contact.fullName}</CardTitle>
          <CardDescription>
            {[contact.organization, contact.jobTitle].filter(Boolean).join(" · ") || "External contact"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PeDetailField
            label="Type"
            value={
              <Badge variant="outline">
                {DIRECTORY_CONTACT_TYPE_LABELS[contact.contactType] ?? contact.contactType}
              </Badge>
            }
          />
          <PeDetailField
            label="Status"
            value={
              <Badge variant={contact.isActive ? "default" : "secondary"}>
                {contact.isActive ? "Active" : "Inactive"}
              </Badge>
            }
          />
          <PeDetailField label="Entity" value={contact.entityName ?? "Global"} />
          <PeDetailField label="Email" value={contact.email} />
          <PeDetailField label="Primary Phone" value={contact.phonePrimary} />
          <PeDetailField label="Secondary Phone" value={contact.phoneSecondary} />
          <PeDetailField label="Website" value={contact.website} />
          {contact.tags.length > 0 ? (
            <div className="sm:col-span-2">
              <PeDetailField
                label="Tags"
                value={
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address & Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PeDetailField label="Address" value={contact.address} />
          <PeDetailField label="Location" value={location || null} />
          <PeDetailField
            label="Last Contact"
            value={contact.lastContactDate ? formatDate(contact.lastContactDate) : null}
          />
          <PeDetailField
            label="Next Follow-up"
            value={
              contact.nextFollowUpDate ? (
                <span className={contact.followUpOverdue ? "text-destructive font-medium" : undefined}>
                  {formatDate(contact.nextFollowUpDate)}
                  {contact.followUpOverdue ? " (overdue)" : ""}
                </span>
              ) : null
            }
          />
          {contact.notes ? (
            <div className="sm:col-span-2">
              <PeDetailField label="Notes" value={contact.notes} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
