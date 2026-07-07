import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { UsersManagement } from "@/components/admin/users-management";
import { listEntities } from "@/lib/data/entities";
import { listDocumentCategories } from "@/lib/data/document-categories";
import { listPendingInvites, listUsers } from "@/lib/data/users";
import { requireSuperAdmin } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function UsersLoadError({ message, digest }: { message: string; digest?: string }) {
  return (
    <>
      <PlatformHeader title="User Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load user management</CardTitle>
            <CardDescription>
              Users, pending invitations, or access configuration could not be loaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            {digest ? <p className="text-xs text-muted-foreground">Reference: {digest}</p> : null}
            <Button type="button" asChild>
              <Link href="/admin/users">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

export default async function AdminUsersPage() {
  await requireSuperAdmin();

  try {
    const [users, pendingInvites, entities, documentCategories] = await Promise.all([
      listUsers(),
      listPendingInvites(),
      listEntities(),
      listDocumentCategories(),
    ]);

    return (
      <>
        <PlatformHeader title="User Management" />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <UsersManagement
            users={users}
            pendingInvites={pendingInvites}
            entities={entities.map((entity) => ({ id: entity.id, name: entity.name }))}
            documentCategories={documentCategories.map((category) => ({
              id: category.id,
              name: category.name,
            }))}
          />
        </main>
      </>
    );
  } catch (error) {
    console.error("Admin users page failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "An unexpected error occurred while loading user management.";
    const digest =
      error instanceof Error && "digest" in error
        ? String((error as Error & { digest?: string }).digest ?? "")
        : undefined;

    return <UsersLoadError message={message} digest={digest || undefined} />;
  }
}
