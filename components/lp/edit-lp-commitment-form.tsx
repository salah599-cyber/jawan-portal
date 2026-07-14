"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLpCommitment } from "@/lib/actions/lp-fund";
import {
  LP_COMMITMENT_STATUS_LABELS,
  LP_FUND_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { formatDateInput } from "@/lib/format";
import type { LpCommitmentDetail } from "@/lib/data/lp-fund";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SGD", "AED", "SAR", "OMR"] as const;

function mapSubmitError(err: unknown) {
  if (!(err instanceof Error)) return "Failed to update commitment.";
  if (/failed to fetch/i.test(err.message)) {
    return "Could not save changes. Please check your connection and try again.";
  }
  return err.message;
}

export function EditLpCommitmentForm({
  commitment,
  entities,
}: {
  commitment: LpCommitmentDetail;
  entities: EntityOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(commitment.entityId);
  const [strategy, setStrategy] = useState<string>(commitment.fund.strategy);
  const [fundStatus, setFundStatus] = useState<string>(commitment.fund.status);
  const [status, setStatus] = useState<string>(commitment.status);
  const [commitmentCurrency, setCommitmentCurrency] = useState(commitment.commitmentCurrency);
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    submittingRef.current = true;
    const formData = new FormData(e.currentTarget);
    formData.set("entityId", entityId);
    formData.set("strategy", strategy);
    formData.set("fundStatus", fundStatus);
    formData.set("status", status);
    formData.set("commitmentCurrency", commitmentCurrency);

    startTransition(async () => {
      try {
        await updateLpCommitment(commitment.id, formData);
        router.push(`/portfolio/fund-lp/${commitment.id}`);
        router.refresh();
      } catch (err) {
        submittingRef.current = false;
        setError(mapSubmitError(err));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {commitment.fund.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fundName">Fund Name</Label>
              <Input
                id="fundName"
                name="fundName"
                required
                defaultValue={commitment.fund.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpManagerName">GP / Manager</Label>
              <Input
                id="gpManagerName"
                name="gpManagerName"
                defaultValue={commitment.fund.gpManager?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Entity</Label>
              <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
            </div>
            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LP_FUND_STRATEGY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vintageYear">Vintage Year</Label>
              <Input
                id="vintageYear"
                name="vintageYear"
                type="number"
                defaultValue={commitment.fund.vintageYear ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundSize">Fund Size</Label>
              <Input
                id="fundSize"
                name="fundSize"
                type="number"
                step="0.01"
                defaultValue={commitment.fund.fundSize?.toString() ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Fund Status</Label>
              <Select value={fundStatus} onValueChange={(v) => setFundStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LP_FUND_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundTermYears">Fund Term (years)</Label>
              <Input
                id="fundTermYears"
                name="fundTermYears"
                type="number"
                defaultValue={commitment.fund.fundTermYears ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investmentPeriodEnd">Investment Period End</Label>
              <Input
                id="investmentPeriodEnd"
                name="investmentPeriodEnd"
                type="date"
                defaultValue={formatDateInput(commitment.fund.investmentPeriodEnd)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fundNotes">Fund Notes</Label>
              <Textarea
                id="fundNotes"
                name="fundNotes"
                rows={2}
                defaultValue={commitment.fund.notes ?? ""}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-4 text-sm font-semibold">Commitment</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commitmentAmount">Commitment Amount</Label>
                <Input
                  id="commitmentAmount"
                  name="commitmentAmount"
                  required
                  type="number"
                  step="0.01"
                  defaultValue={commitment.commitmentAmount.toString()}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={commitmentCurrency} onValueChange={setCommitmentCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commitmentDate">Commitment Date</Label>
                <Input
                  id="commitmentDate"
                  name="commitmentDate"
                  type="date"
                  required
                  defaultValue={formatDateInput(commitment.commitmentDate)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LP_COMMITMENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownershipPctOfFund">Ownership % of Fund</Label>
                <Input
                  id="ownershipPctOfFund"
                  name="ownershipPctOfFund"
                  type="number"
                  step="0.01"
                  defaultValue={commitment.ownershipPctOfFund?.toString() ?? ""}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sideLetterNotes">Side Letter Notes</Label>
                <Textarea
                  id="sideLetterNotes"
                  name="sideLetterNotes"
                  rows={2}
                  defaultValue={commitment.sideLetterNotes ?? ""}
                />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
