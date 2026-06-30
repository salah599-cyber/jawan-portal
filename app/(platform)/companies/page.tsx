import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RowActions } from "@/components/platform/row-actions";
import { listCompanies, deleteCompany } from "@/lib/actions/companies";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CompaniesPage() {
  const ctx = await requireModuleAccess("COMPANIES");
  const companies = await listCompanies();
  const showAdd = canWrite(ctx, "COMPANIES");

  return (
    <>
      <PlatformHeader title="Companies" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Registered Companies</CardTitle>
              <CardDescription>
                Portfolio companies with registration details, owners, management, and corporate documents.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/companies/new" label="Register Company" /> : null}
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Owners</TableHead>
                    <TableHead>CEO</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Updated</TableHead>
                    {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <Link href={"/companies/" + company.id} className="hover:underline">
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>{company.registrationNumber}</TableCell>
                      <TableCell>{company.entity.name}</TableCell>
                      <TableCell>{company.owners.length}</TableCell>
                      <TableCell>{company.ceoName ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ASSET_STATUS_LABELS[company.status] ?? company.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(company.registrationExpiryDate)}</TableCell>
                      <TableCell>{company.documents.length}</TableCell>
                      <TableCell>{formatDate(company.updatedAt)}</TableCell>
                      {showAdd ? (
                        <TableCell>
                          <RowActions
                            editHref={"/companies/" + company.id + "/edit"}
                            itemId={company.id}
                            itemLabel={company.name}
                            deleteAction={deleteCompany}
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
