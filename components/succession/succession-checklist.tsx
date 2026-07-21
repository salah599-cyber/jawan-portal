"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSuccessionChecklistItem } from "@/lib/actions/succession";
import { formatDate } from "@/lib/format";
import type { SerializedSuccessionPlan } from "@/lib/succession/serialize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SuccessionChecklist({
  plan,
  canEdit,
}: {
  plan: SerializedSuccessionPlan;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(itemId: string, checked: boolean) {
    startTransition(async () => {
      await toggleSuccessionChecklistItem(itemId, checked);
      router.refresh();
    });
  }

  const grouped = plan.checklistItems.reduce<Record<string, typeof plan.checklistItems>>((acc, item) => {
    const key = item.category ?? "General";
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Checklist</CardTitle>
        <CardDescription>{plan.checklistCompletionPct}% complete</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-sm font-medium">{category}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit ? <TableHead className="w-10" /> : null}
                  <TableHead>Item</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {canEdit ? (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={item.isComplete}
                          disabled={pending}
                          onChange={(e) => handleToggle(item.id, e.target.checked)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className={item.isComplete ? "text-muted-foreground line-through" : ""}>
                      {item.label}
                    </TableCell>
                    <TableCell>{item.dueDate ? formatDate(item.dueDate) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
