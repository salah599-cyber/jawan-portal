import { PlatformHeader } from "@/components/platform/platform-header";
import { UsersManagement } from "@/components/admin/users-management";
import { listEntities } from "@/lib/data/entities";
import { listPendingInvites, listUsers } from "@/lib/actions/users";
import { requireSuperAdmin } from "@/lib/permissions/access";

export default async function AdminUsersPage() {
  await requireSuperAdmin();
  const [users, pendingInvites, entities] = await Promise.all([
    listUsers(),
    listPendingInvites(),
    listEntities(),
  ]);

  return (
    <>
      <PlatformHeader title="User Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <UsersManagement users={users} pendingInvites={pendingInvites} entities={entities} />
      </main>
    </>
  );
}
