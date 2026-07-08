import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { CompaniesTable } from "@/components/companies/companies-table";
import { listCompanies } from "@/lib/actions/companies";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            <CompaniesTable companies={companies} showAdd={showAdd} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
