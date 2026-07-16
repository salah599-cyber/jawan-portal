import { PlatformHeader } from "@/components/platform/platform-header";
import { DownloadRequestsManagement } from "@/components/admin/download-requests-management";
import { listPendingDownloadRequests, listRecentDownloadRequests } from "@/lib/files/download-access";
import { requireSuperAdmin } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDownloadRequestsPage() {
  await requireSuperAdmin();

  const [pendingRequests, recentRequests] = await Promise.all([
    listPendingDownloadRequests(),
    listRecentDownloadRequests(),
  ]);

  return (
    <>
      <PlatformHeader title="Download Requests" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>File download approvals</CardTitle>
            <CardDescription>
              Review download requests from platform users. Approved downloads are single-use.
              Only super admins can preview or download files without approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DownloadRequestsManagement
              pendingRequests={pendingRequests}
              recentRequests={recentRequests}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
