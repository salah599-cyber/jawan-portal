"use client";

import { useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createLpCommitment } from "@/lib/actions/lp-fund";
import {
  LP_COMMITMENT_STATUS_LABELS,
  LP_FUND_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SGD", "AED", "SAR", "OMR"] as const;

type FundOption = { id: string; name: string; gpName: string | null; strategy: string };

export function CreateLpCommitmentForm({
  entities,
  existingFunds,
}: {
  entities: EntityOption[];
  existingFunds: FundOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fundMode, setFundMode] = useState<"new" | "existing">("new");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [strategy, setStrategy] = useState("OTHER");
  const [fundStatus, setFundStatus] = useState("ACTIVE");
  const [status, setStatus] = useState("ACTIVE");
  const [commitmentCurrency, setCommitmentCurrency] = useState("USD");
  const [existingFundId, setExistingFundId] = useState(existingFunds[0]?.id ?? "");
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    submittingRef.current = true;
    const formData = new FormData(e.currentTarget);
    formData.set("fundMode", fundMode);
    formData.set("entityId", entityId);
    formData.set("strategy", strategy);
    formData.set("fundStatus", fundStatus);
    formData.set("status", status);
    formData.set("commitmentCurrency", commitmentCurrency);
    if (fundMode === "existing") formData.set("existingFundId", existingFundId);

    startTransition(async () => {
      try {
        await createLpCommitment(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        submittingRef.current = false;
        setError(err instanceof Error ? err.message : "Failed to add commitment.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Fund LP Commitment</CardTitle>
        <CardDescription>
          Register an external fund and your LP commitment. Each fund can have one commitment per entity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Entity</Label>
              <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Fund</Label>
              <Select value={fundMode} onValueChange={(v) => setFundMode(v as "new" | "existing")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create new fund</SelectItem>
                  <SelectItem value="existing" disabled={existingFunds.length === 0}>
                    Link to existing fund
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fundMode === "existing" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Existing Fund</Label>
                <Select value={existingFundId} onValueChange={setExistingFundId}>
                  <SelectTrigger><SelectValue placeholder="Select fund" /></SelectTrigger>
                  <SelectContent>
                    {existingFunds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name}
                        {fund.gpName ? ` · ${fund.gpName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fundName">Fund Name</Label>
                  <Input id="fundName" name="fundName" required placeholder="e.g. ABC Growth Fund III" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpManagerName">GP / Manager</Label>
                  <Input id="gpManagerName" name="gpManagerName" placeholder="General partner name" />
                </div>
                <div className="space-y-2">
                  <Label>Strategy</Label>
                  <Select value={strategy} onValueChange={setStrategy}>
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
                  <Input id="vintageYear" name="vintageYear" type="number" min={1990} max={2100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundSize">Fund Size</Label>
                  <Input id="fundSize" name="fundSize" type="number" step="0.01" min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Fund Status</Label>
                  <Select value={fundStatus} onValueChange={setFundStatus}>
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
                  <Input id="fundTermYears" name="fundTermYears" type="number" min={1} max={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investmentPeriodEnd">Investment Period End</Label>
                  <Input id="investmentPeriodEnd" name="investmentPeriodEnd" type="date" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fundNotes">Fund Notes</Label>
                  <Textarea id="fundNotes" name="fundNotes" rows={2} />
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-4 text-sm font-semibold">Your Commitment</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commitmentAmount">Commitment Amount</Label>
                <Input id="commitmentAmount" name="commitmentAmount" required type="number" step="0.01" min="0" />
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
                <Input id="commitmentDate" name="commitmentDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
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
                <Input id="ownershipPctOfFund" name="ownershipPctOfFund" type="number" step="0.01" min="0" max="100" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sideLetterNotes">Side Letter Notes</Label>
                <Textarea id="sideLetterNotes" name="sideLetterNotes" rows={2} />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create Commitment"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
