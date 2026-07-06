"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicHoldingRow } from "@/lib/data/public-markets";
import { updatePublicHolding } from "@/lib/actions/public-markets";
import {
  normalizeHoldingValues,
  normalizeOptionHoldingValues,
} from "@/lib/public-markets/valuation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { Pencil } from "lucide-react";

function formatDateInput(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function calcEquityDerived(quantity: number, marketPrice: number | null, costBasis: number | null) {
  return normalizeHoldingValues(
    { quantity, marketPrice, costBasis },
    { costBasisIsTotal: true },
  );
}

function calcOptionDerived(
  contracts: number,
  marketPrice: number | null,
  premiumPaid: number | null,
  contractMultiplier: number,
) {
  return normalizeOptionHoldingValues({
    contracts,
    marketPrice,
    premiumPaid,
    contractMultiplier,
  });
}

export function EditHoldingDialog({ holding }: { holding: PublicHoldingRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(holding.quantity);
  const [marketPrice, setMarketPrice] = useState<number | null>(holding.marketPrice);
  const [costBasis, setCostBasis] = useState<number | null>(holding.costBasis);
  const [marketValue, setMarketValue] = useState<number | null>(holding.marketValue);
  const [unrealisedPnl, setUnrealisedPnl] = useState<number | null>(holding.unrealisedPnl);
  const [contractMultiplier, setContractMultiplier] = useState(
    holding.option?.contractMultiplier ?? 100,
  );

  useEffect(() => {
    if (!open) return;
    setQuantity(holding.quantity);
    setMarketPrice(holding.marketPrice);
    setCostBasis(holding.costBasis);
    setMarketValue(holding.marketValue);
    setUnrealisedPnl(holding.unrealisedPnl);
    setContractMultiplier(holding.option?.contractMultiplier ?? 100);
    setError(null);
  }, [open, holding]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (holding.instrumentType === "OPTION") {
          await updatePublicHolding(holding.id, {
            underlyingSymbol: String(form.get("underlyingSymbol") ?? ""),
            optionType: String(form.get("optionType") ?? "CALL") as "CALL" | "PUT",
            strikePrice: parseFloat(String(form.get("strikePrice") ?? "")),
            expiryDate: String(form.get("expiryDate") ?? ""),
            quantity,
            marketPrice,
            premiumPaid: costBasis,
            marketValue,
            contractMultiplier,
            broker: String(form.get("broker") ?? ""),
            accountNumber: String(form.get("accountNumber") ?? ""),
            asOfDate: String(form.get("asOfDate") ?? "") || undefined,
          });
        } else if (holding.instrumentType === "STRUCTURED_NOTE") {
          await updatePublicHolding(holding.id, {
            issuer: String(form.get("issuer") ?? ""),
            productName: String(form.get("productName") ?? ""),
            notionalAmount: parseFloat(String(form.get("notionalAmount") ?? "")),
            maturityDate: String(form.get("maturityDate") ?? ""),
            issueDate: String(form.get("issueDate") ?? "") || undefined,
            couponRate: form.get("couponRate")
              ? parseFloat(String(form.get("couponRate")))
              : undefined,
            barrierLevel: form.get("barrierLevel")
              ? parseFloat(String(form.get("barrierLevel")))
              : undefined,
            payoffNotes: String(form.get("payoffNotes") ?? ""),
            marketValue,
            broker: String(form.get("broker") ?? ""),
            accountNumber: String(form.get("accountNumber") ?? ""),
            asOfDate: String(form.get("asOfDate") ?? "") || undefined,
          });
        } else {
          await updatePublicHolding(holding.id, {
            symbol: String(form.get("symbol") ?? ""),
            name: String(form.get("name") ?? ""),
            quantity,
            costBasis,
            marketPrice,
            marketValue,
            unrealisedPnl,
            broker: String(form.get("broker") ?? ""),
            accountNumber: String(form.get("accountNumber") ?? ""),
            asOfDate: String(form.get("asOfDate") ?? "") || undefined,
          });
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update holding.");
      }
    });
  }

  const title =
    holding.instrumentType === "OPTION"
      ? `Edit option ${holding.symbol}`
      : holding.instrumentType === "STRUCTURED_NOTE"
        ? `Edit ${holding.structuredNote?.productName ?? holding.symbol}`
        : `Edit ${holding.symbol}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${holding.symbol}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {holding.instrumentType === "STRUCTURED_NOTE"
              ? "Update note terms and mark-to-market value."
              : holding.instrumentType === "OPTION"
                ? "Update contract terms and mark-to-market value."
                : "Update quantity, total cost basis, or prices."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {holding.instrumentType === "OPTION" ? (
            <OptionFields
              holding={holding}
              quantity={quantity}
              setQuantity={setQuantity}
              marketPrice={marketPrice}
              setMarketPrice={setMarketPrice}
              costBasis={costBasis}
              setCostBasis={setCostBasis}
              marketValue={marketValue}
              setMarketValue={setMarketValue}
              unrealisedPnl={unrealisedPnl}
              setUnrealisedPnl={setUnrealisedPnl}
              contractMultiplier={contractMultiplier}
              setContractMultiplier={setContractMultiplier}
            />
          ) : holding.instrumentType === "STRUCTURED_NOTE" ? (
            <StructuredNoteFields
              holding={holding}
              marketValue={marketValue}
              setMarketValue={setMarketValue}
            />
          ) : (
            <EquityFields
              holding={holding}
              quantity={quantity}
              setQuantity={setQuantity}
              marketPrice={marketPrice}
              setMarketPrice={setMarketPrice}
              costBasis={costBasis}
              setCostBasis={setCostBasis}
              marketValue={marketValue}
              setMarketValue={setMarketValue}
              unrealisedPnl={unrealisedPnl}
              setUnrealisedPnl={setUnrealisedPnl}
            />
          )}

          {holding.priceSource && holding.instrumentType === "EQUITY" ? (
            <p className="text-xs text-muted-foreground">
              Price source: {holding.priceSource}
              {holding.priceFetchedAt
                ? ` · last fetched ${formatDateTime(holding.priceFetchedAt)}`
                : ""}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquityFields({
  holding,
  quantity,
  setQuantity,
  marketPrice,
  setMarketPrice,
  costBasis,
  setCostBasis,
  marketValue,
  setMarketValue,
  unrealisedPnl,
  setUnrealisedPnl,
}: {
  holding: PublicHoldingRow;
  quantity: number;
  setQuantity: (v: number) => void;
  marketPrice: number | null;
  setMarketPrice: (v: number | null) => void;
  costBasis: number | null;
  setCostBasis: (v: number | null) => void;
  marketValue: number | null;
  setMarketValue: (v: number | null) => void;
  unrealisedPnl: number | null;
  setUnrealisedPnl: (v: number | null) => void;
}) {
  function recalc(price: number | null, qty: number, cost: number | null) {
    const derived = calcEquityDerived(qty, price, cost);
    setMarketValue(derived.marketValue);
    setUnrealisedPnl(derived.unrealisedPnl);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`symbol-${holding.id}`}>Symbol</Label>
        <Input id={`symbol-${holding.id}`} name="symbol" required defaultValue={holding.symbol} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`name-${holding.id}`}>Security name</Label>
        <Input id={`name-${holding.id}`} name="name" defaultValue={holding.name ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`quantity-${holding.id}`}>Quantity</Label>
        <Input
          id={`quantity-${holding.id}`}
          type="number"
          step="any"
          min="0"
          required
          value={quantity}
          onChange={(e) => {
            const qty = parseFloat(e.target.value);
            const nextQty = Number.isNaN(qty) ? 0 : qty;
            setQuantity(nextQty);
            recalc(marketPrice, nextQty, costBasis);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`marketPrice-${holding.id}`}>Market price ({holding.currency})</Label>
        <Input
          id={`marketPrice-${holding.id}`}
          type="number"
          step="any"
          min="0"
          value={marketPrice ?? ""}
          onChange={(e) => {
            const price = e.target.value === "" ? null : parseFloat(e.target.value);
            const nextPrice = price != null && !Number.isNaN(price) ? price : null;
            setMarketPrice(nextPrice);
            recalc(nextPrice, quantity, costBasis);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`costBasis-${holding.id}`}>Total cost basis ({holding.currency})</Label>
        <Input
          id={`costBasis-${holding.id}`}
          type="number"
          step="any"
          min="0"
          value={costBasis ?? ""}
          onChange={(e) => {
            const cost = e.target.value === "" ? null : parseFloat(e.target.value);
            const nextCost = cost != null && !Number.isNaN(cost) ? cost : null;
            setCostBasis(nextCost);
            recalc(marketPrice, quantity, nextCost);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Market value ({holding.currency})</Label>
        <Input value={marketValue ?? ""} readOnly className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label>Unrealised P&L ({holding.currency})</Label>
        <Input value={unrealisedPnl ?? ""} readOnly className="bg-muted" />
      </div>
      <BrokerFields holding={holding} />
    </div>
  );
}

function OptionFields({
  holding,
  quantity,
  setQuantity,
  marketPrice,
  setMarketPrice,
  costBasis,
  setCostBasis,
  marketValue,
  setMarketValue,
  unrealisedPnl,
  setUnrealisedPnl,
  contractMultiplier,
  setContractMultiplier,
}: {
  holding: PublicHoldingRow;
  quantity: number;
  setQuantity: (v: number) => void;
  marketPrice: number | null;
  setMarketPrice: (v: number | null) => void;
  costBasis: number | null;
  setCostBasis: (v: number | null) => void;
  marketValue: number | null;
  setMarketValue: (v: number | null) => void;
  unrealisedPnl: number | null;
  setUnrealisedPnl: (v: number | null) => void;
  contractMultiplier: number;
  setContractMultiplier: (v: number) => void;
}) {
  const option = holding.option!;

  function recalc(
    price: number | null,
    qty: number,
    premium: number | null,
    multiplier: number,
  ) {
    const derived = calcOptionDerived(qty, price, premium, multiplier);
    setMarketValue(derived.marketValue);
    setUnrealisedPnl(derived.unrealisedPnl);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`underlying-${holding.id}`}>Underlying</Label>
        <Input
          id={`underlying-${holding.id}`}
          name="underlyingSymbol"
          required
          defaultValue={option.underlyingSymbol}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`optionType-${holding.id}`}>Type</Label>
        <select
          id={`optionType-${holding.id}`}
          name="optionType"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={option.optionType}
        >
          <option value="CALL">Call</option>
          <option value="PUT">Put</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`strike-${holding.id}`}>Strike</Label>
        <Input
          id={`strike-${holding.id}`}
          name="strikePrice"
          type="number"
          step="any"
          required
          defaultValue={option.strikePrice}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`expiry-${holding.id}`}>Expiry</Label>
        <Input
          id={`expiry-${holding.id}`}
          name="expiryDate"
          type="date"
          required
          defaultValue={formatDateInput(option.expiryDate)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`contracts-${holding.id}`}>Contracts</Label>
        <Input
          id={`contracts-${holding.id}`}
          type="number"
          step="any"
          min="0"
          required
          value={quantity}
          onChange={(e) => {
            const qty = parseFloat(e.target.value);
            const nextQty = Number.isNaN(qty) ? 0 : qty;
            setQuantity(nextQty);
            recalc(marketPrice, nextQty, costBasis, contractMultiplier);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`multiplier-${holding.id}`}>Multiplier</Label>
        <Input
          id={`multiplier-${holding.id}`}
          name="contractMultiplier"
          type="number"
          min="1"
          value={contractMultiplier}
          onChange={(e) => {
            const mult = parseFloat(e.target.value) || 100;
            setContractMultiplier(mult);
            recalc(marketPrice, quantity, costBasis, mult);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`marketPrice-${holding.id}`}>Price per contract</Label>
        <Input
          id={`marketPrice-${holding.id}`}
          type="number"
          step="any"
          min="0"
          value={marketPrice ?? ""}
          onChange={(e) => {
            const price = e.target.value === "" ? null : parseFloat(e.target.value);
            const nextPrice = price != null && !Number.isNaN(price) ? price : null;
            setMarketPrice(nextPrice);
            recalc(nextPrice, quantity, costBasis, contractMultiplier);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`premium-${holding.id}`}>Premium paid</Label>
        <Input
          id={`premium-${holding.id}`}
          type="number"
          step="any"
          min="0"
          value={costBasis ?? ""}
          onChange={(e) => {
            const premium = e.target.value === "" ? null : parseFloat(e.target.value);
            const nextPremium = premium != null && !Number.isNaN(premium) ? premium : null;
            setCostBasis(nextPremium);
            recalc(marketPrice, quantity, nextPremium, contractMultiplier);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Market value</Label>
        <Input value={marketValue ?? ""} readOnly className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label>Unrealised P&L</Label>
        <Input value={unrealisedPnl ?? ""} readOnly className="bg-muted" />
      </div>
      <BrokerFields holding={holding} />
    </div>
  );
}

function StructuredNoteFields({
  holding,
  marketValue,
  setMarketValue,
}: {
  holding: PublicHoldingRow;
  marketValue: number | null;
  setMarketValue: (v: number | null) => void;
}) {
  const note = holding.structuredNote!;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`issuer-${holding.id}`}>Issuer</Label>
        <Input id={`issuer-${holding.id}`} name="issuer" required defaultValue={note.issuer} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`product-${holding.id}`}>Product name</Label>
        <Input
          id={`product-${holding.id}`}
          name="productName"
          required
          defaultValue={note.productName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`notional-${holding.id}`}>Notional</Label>
        <Input
          id={`notional-${holding.id}`}
          name="notionalAmount"
          type="number"
          step="any"
          required
          defaultValue={note.notionalAmount}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`mtm-${holding.id}`}>Mark-to-market</Label>
        <Input
          id={`mtm-${holding.id}`}
          type="number"
          step="any"
          min="0"
          value={marketValue ?? ""}
          onChange={(e) => {
            const value = e.target.value === "" ? null : parseFloat(e.target.value);
            setMarketValue(value != null && !Number.isNaN(value) ? value : null);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`maturity-${holding.id}`}>Maturity</Label>
        <Input
          id={`maturity-${holding.id}`}
          name="maturityDate"
          type="date"
          required
          defaultValue={formatDateInput(note.maturityDate)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`issue-${holding.id}`}>Issue date</Label>
        <Input
          id={`issue-${holding.id}`}
          name="issueDate"
          type="date"
          defaultValue={formatDateInput(note.issueDate)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`coupon-${holding.id}`}>Coupon rate (%)</Label>
        <Input
          id={`coupon-${holding.id}`}
          name="couponRate"
          type="number"
          step="any"
          defaultValue={note.couponRate ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`barrier-${holding.id}`}>Barrier</Label>
        <Input
          id={`barrier-${holding.id}`}
          name="barrierLevel"
          type="number"
          step="any"
          defaultValue={note.barrierLevel ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`payoff-${holding.id}`}>Payoff notes</Label>
        <Input
          id={`payoff-${holding.id}`}
          name="payoffNotes"
          defaultValue={note.payoffNotes ?? ""}
        />
      </div>
      <BrokerFields holding={holding} />
    </div>
  );
}

function BrokerFields({ holding }: { holding: PublicHoldingRow }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`broker-${holding.id}`}>Broker</Label>
        <Input id={`broker-${holding.id}`} name="broker" defaultValue={holding.broker ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`accountNumber-${holding.id}`}>Account number</Label>
        <Input
          id={`accountNumber-${holding.id}`}
          name="accountNumber"
          defaultValue={holding.accountNumber ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`asOfDate-${holding.id}`}>As of date</Label>
        <Input
          id={`asOfDate-${holding.id}`}
          name="asOfDate"
          type="date"
          defaultValue={formatDateInput(holding.asOfDate)}
        />
      </div>
    </>
  );
}
