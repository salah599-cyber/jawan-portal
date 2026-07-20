"use client";

import { CASH_CURRENCIES } from "@/lib/cash/constants";
import type { BankAccountNumberInput } from "@/lib/bank/account-numbers";
import { defaultCurrencyForRegion } from "@/lib/bank/region";
import type { BankAccountRegion } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyAccount = (region: BankAccountRegion): BankAccountNumberInput => ({
  accountNumber: "",
  currency: defaultCurrencyForRegion(region),
  iban: "",
  label: "",
  includeInTransferLetterSource: false,
});

export function BankAccountNumbersFields({
  accounts,
  onChange,
  region = "OMAN",
}: {
  accounts: BankAccountNumberInput[];
  onChange: (accounts: BankAccountNumberInput[]) => void;
  region?: BankAccountRegion;
}) {
  const rows = accounts.length > 0 ? accounts : [emptyAccount(region)];
  const isUsa = region === "USA";

  function updateAccount(index: number, patch: Partial<BankAccountNumberInput>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addAccount() {
    onChange([...rows, emptyAccount(region)]);
  }

  function removeAccount(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyAccount(region)]);
  }

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Registered Accounts</p>
          <p className="text-xs text-muted-foreground">
            {isUsa
              ? "Add each US account number at this bank on its own line."
              : "Add each account at this bank on its own line — number, currency, and IBAN can differ."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAccount}>
          Add account
        </Button>
      </div>
      {rows.map((account, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border bg-background p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">Account {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rows.length === 1}
              onClick={() => removeAccount(index)}
            >
              Remove
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={account.accountNumber}
                onChange={(e) => updateAccount(index, { accountNumber: e.target.value })}
                placeholder={isUsa ? "1234567890" : "1049-485882-001"}
                required={index === 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={account.currency || defaultCurrencyForRegion(region)}
                onValueChange={(value) => updateAccount(index, { currency: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASH_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isUsa ? (
              <div className="space-y-2 md:col-span-2">
                <Label>IBAN</Label>
                <Input
                  value={account.iban ?? ""}
                  onChange={(e) => updateAccount(index, { iban: e.target.value })}
                  placeholder="OM00 0000 0000 0000 0000 0000 000"
                />
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label>Label (optional)</Label>
              <Input
                value={account.label ?? ""}
                onChange={(e) => updateAccount(index, { label: e.target.value })}
                placeholder={isUsa ? "Checking, savings…" : "Current, savings, USD account…"}
              />
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <input
                type="checkbox"
                id={`includeInTransferLetterSource-${index}`}
                checked={account.includeInTransferLetterSource ?? false}
                onChange={(e) =>
                  updateAccount(index, { includeInTransferLetterSource: e.target.checked })
                }
                className="mt-1 size-4 rounded border border-input"
              />
              <div className="space-y-1">
                <label
                  htmlFor={`includeInTransferLetterSource-${index}`}
                  className="text-sm font-medium"
                >
                  Include in transfer letter source accounts
                </label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this account number appears in the transfer letter source dropdown.
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
