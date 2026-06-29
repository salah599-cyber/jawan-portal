import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { listLands, deleteLand } from "@/lib/actions/lands";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function LandsPage() {
  const ctx = await requireModuleAccess("LANDS");
  const lands = await listLands();
  const showAdd = canWrite(ctx, "LANDS");

  return (
    <>
      <PlatformHeader title="Lands" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Oman Lands</CardTitle>
              <CardDescription>Empty land parcels in Oman — Krooki, Mulkia, and supporting documents.</CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/lands/new" label="Register Land" /> : null}
          </CardHeader>
          <CardContent>
            {lands.length === 0 ? (
              <p className="text-sm text-muted-foreground">No land parcels registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Krooki / Mulkia</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Updated</TableHead>
                    {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">
                        <Link href={"/lands/" + land.id} className="hover:underline">{land.name}</Link>
                      </TableCell>
                      <TableCell>{land.wilayat}, {land.governorate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[land.krookiNumber, land.mulkiaNumber].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell>{land.entity.name}</TableCell>
                      <TableCell><Badge variant="secondary">{ASSET_STATUS_LABELS[land.status] ?? land.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatMoney(land.currentValue, land.currency)}</TableCell>
                      <TableCell>{land.documents.length}</TableCell>
                      <TableCell>{formatDate(land.updatedAt)}</TableCell>
                      {showAdd ? (
                        <TableCell>
                          <DeleteEntryButton
                            itemId={land.id}
                            itemLabel={land.name}
                            deleteAction={deleteLand}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
