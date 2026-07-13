"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProposal } from "@/lib/actions/proposals";
import { uploadProposalDeckClient } from "@/lib/blob/client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect } from "@/components/platform/entity-select";
import { ApproverSelect, type ApproverOption } from "@/components/proposals/approver-select";
import { ALLOWED_UPLOAD_ACCEPT, MAX_UPLOAD_LABEL } from "@/lib/upload-limits";

function mapSubmitError(err: unknown) {
  if (!(err instanceof Error)) return "Failed to save proposal.";
  if (/failed to fetch/i.test(err.message)) {
    return "Upload failed. Large decks must upload directly — please try again, or use a file under " + MAX_UPLOAD_LABEL + ".";
  }
  return err.message;
}

export function CreateProposalForm({
  entities,
  users,
  currentUserId,
}: {
  entities: { id: string; name: string }[];
  users: ApproverOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState("none");
  const [currency, setCurrency] = useState("OMR");
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [deckFile, setDeckFile] = useState<File | null>(null);
  const [submitNow, setSubmitNow] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("entityId", entityId);
    formData.set("currency", currency);
    formData.set("submitNow", submitNow ? "true" : "false");
    formData.delete("deckFiles");
    formData.delete("deckFileUrl");
    formData.delete("deckFileName");
    formData.delete("deckMimeType");
    formData.delete("deckFileSize");
    approverIds.forEach((id) => formData.append("approverIds", id));

    startTransition(async () => {
      try {
        if (deckFile) {
          const uploaded = await uploadProposalDeckClient(deckFile, currentUserId);
          formData.set("deckFileUrl", uploaded.fileUrl);
          formData.set("deckFileName", uploaded.fileName);
          formData.set("deckMimeType", uploaded.mimeType);
          formData.set("deckFileSize", String(uploaded.fileSize));
        }
        const proposal = await createProposal(formData);
        router.push("/proposals/" + proposal.id);
        router.refresh();
      } catch (err) {
        setError(mapSubmitError(err));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Investment Proposal</CardTitle>
        <CardDescription>Submit a new investment opportunity for committee review.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Investment Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggestedAmount">Suggested Amount</Label>
            <Input id="suggestedAmount" name="suggestedAmount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Entity (optional)</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={setEntityId}
              allowNone
              noneLabel="No specific entity"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="brief">Brief About the Investment</Label>
            <Textarea id="brief" name="brief" rows={4} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="recommendation">Recommendation</Label>
            <Textarea id="recommendation" name="recommendation" rows={3} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://example.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="deckFiles">Investment Deck</Label>
            <Input
              id="deckFiles"
              type="file"
              accept={ALLOWED_UPLOAD_ACCEPT}
              onChange={(e) => setDeckFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Required when submitting for approval. PDF or PowerPoint preferred (max {MAX_UPLOAD_LABEL}).
            </p>
          </div>
          <ApproverSelect
            users={users}
            currentUserId={currentUserId}
            selectedIds={approverIds}
            onChange={setApproverIds}
          />
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" variant="outline" disabled={pending} onClick={() => setSubmitNow(false)}>
              {pending ? "Saving..." : "Save Draft"}
            </Button>
            <Button type="submit" disabled={pending} onClick={() => setSubmitNow(true)}>
              {pending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
