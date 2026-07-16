"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideFileDownloadRequest } from "@/lib/actions/file-download-requests";
import {
  FILE_DOWNLOAD_REQUEST_STATUS_LABELS,
  FILE_KIND_LABELS,
  formatRequesterName,
  type FileDownloadRequestStatus,
} from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RequestRow = {
  id: string;
  kind: string;
  fileId: string;
  fileName: string;
  reason: string;
  status: FileDownloadRequestStatus;
  reviewComment: string | null;
  reviewedAt: Date | string | null;
  downloadedAt: Date | string | null;
  createdAt: Date | string;
  requestedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  reviewedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

function statusVariant(status: FileDownloadRequestStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "secondary";
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  function submit(decision: "APPROVED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      try {
        await decideFileDownloadRequest({ requestId, decision, reviewComment: comment });
        setComment("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update request.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={`comment-${requestId}`}>Review comment (optional)</Label>
        <Textarea
          id={`comment-${requestId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Optional note for the requester"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => submit("APPROVED")}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => submit("REJECTED")}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function RequestsTable({
  requests,
  showActions,
}: {
  requests: RequestRow[];
  showActions: boolean;
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No download requests in this view.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          {showActions ? <TableHead className="min-w-[220px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{request.fileName}</TableCell>
            <TableCell>{FILE_KIND_LABELS[request.kind as FileKind] ?? request.kind}</TableCell>
            <TableCell>
              <div>
                <p>{formatRequesterName(request.requestedBy)}</p>
                <p className="text-xs text-muted-foreground">{request.requestedBy.email}</p>
              </div>
            </TableCell>
            <TableCell className="max-w-xs whitespace-pre-wrap text-sm">{request.reason}</TableCell>
            <TableCell>{formatDate(request.createdAt)}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(request.status)}>
                {FILE_DOWNLOAD_REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </TableCell>
            {showActions ? (
              <TableCell>
                {request.status === "PENDING" ? <RequestActions requestId={request.id} /> : "—"}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DownloadRequestsManagement({
  pendingRequests,
  recentRequests,
}: {
  pendingRequests: RequestRow[];
  recentRequests: RequestRow[];
}) {
  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
        <TabsTrigger value="recent">Recent</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <RequestsTable requests={pendingRequests} showActions />
      </TabsContent>
      <TabsContent value="recent" className="mt-4">
        <RequestsTable requests={recentRequests} showActions={false} />
      </TabsContent>
    </Tabs>
  );
}
