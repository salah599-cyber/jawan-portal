import { PlatformHeader } from "@/components/platform/platform-header";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DocumentsTable } from "@/components/documents/documents-table";
import { listDocuments } from "@/lib/data/documents";
import { listDocumentCategories } from "@/lib/data/document-categories";
import { listEntities } from "@/lib/data/entities";
import { canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DocumentsPage() {
  const ctx = await requireModuleAccess("DOCUMENTS");
  const [documents, entities, allCategories] = await Promise.all([
    listDocuments(ctx),
    listEntities(),
    listDocumentCategories(),
  ]);
  const showUpload = canWrite(ctx, "DOCUMENTS");
  const level = getModulePermission(ctx, "DOCUMENTS");
  const uploadCategories =
    level === "FILTERED"
      ? allCategories.filter((category) => ctx.documentCategories.includes(category.id))
      : allCategories;

  return (
    <>
      <PlatformHeader title="Document Vault" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {showUpload ? (
          <UploadDocumentForm
            entities={entities}
            categories={uploadCategories}
            canAddCategory={showUpload}
            existingNames={documents.map((d) => d.name)}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Secure storage for KYC, legal, and corporate documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentsTable documents={documents} showUpload={showUpload} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
