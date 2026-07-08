import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

type AuditLogEntry = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: Date;
  metadata: unknown;
  user: { firstName: string | null; lastName: string | null; email: string } | null;
};

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "DELETE") return "destructive";
  if (action === "CREATE" || action === "UPLOAD") return "default";
  return "secondary";
}

function formatActor(user: AuditLogEntry["user"]) {
  if (!user) return "System";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name ? `${name} (${user.email})` : user.email;
}

function formatMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "—";
  const entries = Object.entries(metadata as Record<string, unknown>).filter(([key]) => key !== "userAgent");
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events match your filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>IP Address</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {formatDateTime(entry.createdAt)}
            </TableCell>
            <TableCell className="text-sm">{formatActor(entry.user)}</TableCell>
            <TableCell>
              <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
            </TableCell>
            <TableCell className="text-sm">
              {entry.resource}
              {entry.resourceId ? <span className="text-muted-foreground"> #{entry.resourceId.slice(-8)}</span> : null}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{entry.ipAddress ?? "—"}</TableCell>
            <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={formatMetadata(entry.metadata)}>
              {formatMetadata(entry.metadata)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
