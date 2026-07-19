"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ManagedPortfolioRow } from "@/lib/data/managed-portfolios";
import { createManagedPortfolio, deleteManagedPortfolio } from "@/lib/actions/managed-portfolios";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Trash2 } from "lucide-react";

export function ManageManagedPortfoliosCard({
  entities,
  defaultEntityId,
  portfolios,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  portfolios: ManagedPortfolioRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("entityId", entityId);

    startTransition(async () => {
      try {
        await createManagedPortfolio(formData);
        setSuccess("Managed portfolio created.");
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create managed portfolio.");
      }
    });
  }

  function handleDelete(portfolioId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteManagedPortfolio(portfolioId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete managed portfolio.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Managed Portfolios
        </CardTitle>
        <CardDescription>
          Create a separate portfolio for each manager so performance can be tracked independently.
          Private holdings stay outside managed portfolios.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Entity</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={setEntityId}
              allowAdd={false}
              placeholder="Select entity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio-name">Portfolio name</Label>
            <Input id="portfolio-name" name="name" required placeholder="Global Equity Mandate" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager-name">Manager name</Label>
            <Input id="manager-name" name="managerName" required placeholder="UBS Wealth" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio-account">Account / mandate ID</Label>
            <Input id="portfolio-account" name="accountNumber" placeholder="Optional" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="portfolio-notes">Notes</Label>
            <Input id="portfolio-notes" name="notes" placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Add managed portfolio"}
            </Button>
          </div>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        {portfolios.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Active managed portfolios</p>
            <ul className="space-y-2">
              {portfolios.map((portfolio) => (
                <li
                  key={portfolio.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {portfolio.managerName} — {portfolio.name}
                    </p>
                    <p className="text-muted-foreground">
                      {portfolio.holdingCount} holding{portfolio.holdingCount === 1 ? "" : "s"}
                      {portfolio.accountNumber ? ` · ${portfolio.accountNumber}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={pending || portfolio.holdingCount > 0}
                    title={
                      portfolio.holdingCount > 0
                        ? "Remove holdings before deleting this portfolio"
                        : "Delete managed portfolio"
                    }
                    onClick={() => handleDelete(portfolio.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No managed portfolios yet. Create one for each manager before importing their reports.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
