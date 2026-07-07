import { PlatformHeader } from "@/components/platform/platform-header";
import { UsersManagement } from "@/components/admin/users-management";
import { listEntities } from "@/lib/data/entities";
import { listDocumentCategories } from "@/lib/data/document-categories";
import { listPendingInvites, listUsers } from "@/lib/data/users";
import { requireSuperAdmin } from "@/lib/permissions/access";

export default async function AdminUsersPage() {
  await requireSuperAdmin();
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
          entities={entities}
          documentCategories={documentCategories}
        />
      </main>
    </>
  );
}
