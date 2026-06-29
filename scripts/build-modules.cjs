const fs = require("fs");
const path = require("path");

const root = process.cwd();

function w(relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

const files = {
  "lib/data/entities.ts": `import { db } from "@/lib/db";

const DEFAULT_ENTITY_NAME = "Jawan Investments";

export async function ensureDefaultEntity() {
  const existing = await db.entity.findFirst({
    where: { name: DEFAULT_ENTITY_NAME },
  });
  if (existing) return existing;

  const anyEntity = await db.entity.findFirst();
  if (anyEntity) return anyEntity;

  return db.entity.create({
    data: { name: DEFAULT_ENTITY_NAME },
  });
}

export async function listEntities() {
  await ensureDefaultEntity();
  return db.entity.findMany({ orderBy: { name: "asc" } });
}
`,

  "lib/format.ts": `export function formatMoney(
  amount: number | string | { toString(): string } | null | undefined,
  currency = "OMR",
): string {
  if (amount == null || amount === "") return "—";
  const value = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
`,

  "lib/labels.ts": `export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  REAL_ESTATE: "Real Estate",
  PRIVATE_EQUITY: "Private Equity",
  PUBLIC_EQUITY: "Public Equity",
  FIXED_ASSET: "Fixed Asset",
  BONDS: "Bonds",
  CASH: "Cash",
  OTHER: "Other",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MONITOR: "Monitor",
  EXITED: "Exited",
  DEFERRED: "Deferred",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  KYC: "KYC",
  LEGAL: "Legal",
  PROPERTY: "Property",
  CORPORATE: "Corporate",
  TAX: "Tax",
  BANKING: "Banking",
  OTHER: "Other",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  VALID: "Valid",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  OVERDUE: "Overdue",
};

export const EXPENSE_CATEGORY_OPTIONS = [
  "Operations",
  "Property",
  "Legal",
  "Tax",
  "Insurance",
  "Utilities",
  "Professional Fees",
  "Other",
] as const;
`,

  "lib/actions/assets.ts": `"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { AssetCategory, AssetStatus } from "@/lib/generated/prisma/client";

export type CreateAssetInput = {
  name: string;
  category: AssetCategory;
  entityId: string;
  status: AssetStatus;
  currency: string;
  acquisitionCost?: string;
  currentValue?: string;
  description?: string;
  managerName?: string;
  managerEmail?: string;
};

function categoryDetailCreate(category: AssetCategory) {
  switch (category) {
    case "REAL_ESTATE":
      return { realEstate: { create: {} } };
    case "PRIVATE_EQUITY":
      return { privateEquity: { create: {} } };
    case "FIXED_ASSET":
      return { fixedAsset: { create: {} } };
    case "BONDS":
      return { bond: { create: {} } };
    case "CASH":
      return { cash: { create: {} } };
    case "PUBLIC_EQUITY":
    case "OTHER":
    default:
      return { custom: { create: {} } };
  }
}

function parseDecimal(value?: string) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

export async function createAsset(input: CreateAssetInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create assets.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(input.entityId)) {
    const level = ctx.overrides.ASSETS ?? undefined;
    if (level === "FILTERED" || (ctx.entityIds.length > 0 && ctx.role !== "PRINCIPAL")) {
      throw new Error("You do not have access to this entity.");
    }
  }

  const asset = await db.asset.create({
    data: {
      name: input.name.trim(),
      category: input.category,
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionCost: parseDecimal(input.acquisitionCost),
      currentValue: parseDecimal(input.currentValue),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      ...categoryDetailCreate(input.category),
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Asset",
    resourceId: asset.id,
    metadata: { name: asset.name, category: asset.category },
  });

  revalidatePath("/assets");
  return asset;
}

export async function listAssets() {
  const ctx = await requireModuleAccess("ASSETS");
  return db.asset.findMany({
    where: assetEntityFilter(ctx),
    include: { entity: true },
    orderBy: { updatedAt: "desc" },
  });
}
`,

  "lib/actions/bank-accounts.ts": `"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";

export type CreateBankAccountInput = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  sortCode?: string;
  currency: string;
  entityId?: string;
  notes?: string;
};

function bankAccountFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create bank accounts.");
  }

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const account = await db.bankAccount.create({
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      iban: input.iban?.trim() || undefined,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: input.currency || "OMR",
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "BankAccount",
    resourceId: account.id,
    metadata: { accountName: account.accountName, bankName: account.bankName },
  });

  revalidatePath("/assets/bank-details");
  return account;
}

export async function listBankAccounts() {
  const ctx = await requireModuleAccess("ASSETS");
  return db.bankAccount.findMany({
    where: bankAccountFilter(ctx),
    include: { entity: true },
    orderBy: { updatedAt: "desc" },
  });
}
`,

  "lib/actions/documents.ts": `"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { documentFilter } from "@/lib/permissions/scoped-queries";
import type { DocumentCategory } from "@/lib/generated/prisma/client";

export type CreateDocumentInput = {
  name: string;
  category: DocumentCategory;
  expiryDate?: string;
  entityId?: string;
};

export async function createDocument(formData: FormData) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!canWrite(ctx, "DOCUMENTS")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as DocumentCategory;
  const expiryDateRaw = String(formData.get("expiryDate") ?? "").trim();
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();

  if (!name) throw new Error("Document name is required.");
  if (!category) throw new Error("Category is required.");

  const pathname = "documents/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(pathname, file, {
    access: "public",
    token,
    contentType: file.type || undefined,
  });

  const document = await db.document.create({
    data: {
      name,
      fileName: file.name,
      fileUrl: blob.url,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      category,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : undefined,
      entityId: entityIdRaw || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Document",
    resourceId: document.id,
    metadata: { name: document.name, category: document.category },
  });

  revalidatePath("/documents");
  return document;
}

export async function listDocuments() {
  const ctx = await requireModuleAccess("DOCUMENTS");
  return db.document.findMany({
    where: documentFilter(ctx),
    include: { entity: true },
    orderBy: { updatedAt: "desc" },
  });
}
`,

  "lib/actions/expenses.ts": `"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { expenseEntityFilter } from "@/lib/permissions/scoped-queries";
import type { ExpenseStatus } from "@/lib/generated/prisma/client";

export type CreateExpenseInput = {
  title: string;
  amount: string;
  currency: string;
  category: string;
  status: ExpenseStatus;
  dueDate?: string;
  isRecurring: boolean;
  entityId?: string;
};

export async function createExpense(input: CreateExpenseInput) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to create expenses.");
  }

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const amount = input.amount.trim();
  if (!amount || Number.isNaN(parseFloat(amount))) {
    throw new Error("A valid amount is required.");
  }

  const expense = await db.expense.create({
    data: {
      title: input.title.trim(),
      amount,
      currency: input.currency || "OMR",
      category: input.category.trim(),
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      isRecurring: input.isRecurring,
      entityId: input.entityId || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Expense",
    resourceId: expense.id,
    metadata: { title: expense.title, amount: expense.amount.toString() },
  });

  revalidatePath("/expenses");
  return expense;
}

export async function listExpenses() {
  const ctx = await requireModuleAccess("EXPENSES");
  return db.expense.findMany({
    where: expenseEntityFilter(ctx),
    include: { entity: true },
    orderBy: { dueDate: "desc" },
  });
}
`,

  "components/platform/add-link-button.tsx": `"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AddLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
`,

  "components/assets/create-asset-form.tsx": `"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAsset } from "@/lib/actions/assets";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

export function CreateAssetForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("REAL_ESTATE");
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [currency, setCurrency] = useState("OMR");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createAsset({
          name: String(form.get("name") ?? ""),
          category: category as never,
          entityId: entityId || String(form.get("entityId") ?? ""),
          status: status as never,
          currency,
          acquisitionCost: String(form.get("acquisitionCost") ?? ""),
          currentValue: String(form.get("currentValue") ?? ""),
          description: String(form.get("description") ?? ""),
          managerName: String(form.get("managerName") ?? ""),
          managerEmail: String(form.get("managerEmail") ?? ""),
        });
        router.push("/assets");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create asset.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Asset name" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
            <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Value</Label>
            <Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input id="managerName" name="managerName" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input id="managerEmail" name="managerEmail" type="email" />
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Asset"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`,

  "components/bank/create-bank-form.tsx": `"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankAccount } from "@/lib/actions/bank-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

export function CreateBankForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("OMR");
  const [entityId, setEntityId] = useState<string>("none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createBankAccount({
          accountName: String(form.get("accountName") ?? ""),
          bankName: String(form.get("bankName") ?? ""),
          accountNumber: String(form.get("accountNumber") ?? ""),
          iban: String(form.get("iban") ?? ""),
          swiftCode: String(form.get("swiftCode") ?? ""),
          sortCode: String(form.get("sortCode") ?? ""),
          currency,
          entityId: entityId === "none" ? undefined : entityId,
          notes: String(form.get("notes") ?? ""),
        });
        router.push("/assets/bank-details");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create bank account.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Bank Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input id="accountName" name="accountName" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" name="bankName" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" name="accountNumber" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="swiftCode">SWIFT Code</Label>
            <Input id="swiftCode" name="swiftCode" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortCode">Sort Code</Label>
            <Input id="sortCode" name="sortCode" />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Bank Account"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`,

  "components/documents/upload-document-form.tsx": `"use client";

import { useState, useTransition } from "react";
import { createDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

export function UploadDocumentForm({ entities }: { entities: EntityOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [category, setCategory] = useState("CORPORATE");
  const [entityId, setEntityId] = useState<string>("none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(e.currentTarget);
    form.set("category", category);
    form.set("entityId", entityId === "none" ? "" : entityId);

    startTransition(async () => {
      try {
        const doc = await createDocument(form);
        setSuccess("Uploaded " + doc.name);
        e.currentTarget.reset();
        setEntityId("none");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload document.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Document title" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Entity (optional)</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-600 md:col-span-2">{success}</p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`,

  "components/expenses/create-expense-form.tsx": `"use client";

import { useState, useTransition } from "react";
import { createExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

export function CreateExpenseForm({ entities }: { entities: EntityOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORY_OPTIONS[0]);
  const [status, setStatus] = useState("PENDING");
  const [currency, setCurrency] = useState("OMR");
  const [entityId, setEntityId] = useState<string>("none");
  const [isRecurring, setIsRecurring] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const expense = await createExpense({
          title: String(form.get("title") ?? ""),
          amount: String(form.get("amount") ?? ""),
          currency,
          category,
          status: status as never,
          dueDate: String(form.get("dueDate") ?? ""),
          isRecurring,
          entityId: entityId === "none" ? undefined : entityId,
        });
        setSuccess("Created expense: " + expense.title);
        e.currentTarget.reset();
        setIsRecurring(false);
        setEntityId("none");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create expense.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="isRecurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="size-4 rounded border"
            />
            <Label htmlFor="isRecurring">Recurring expense</Label>
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-600 md:col-span-2">{success}</p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`,

  "app/(platform)/assets/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { listAssets } from "@/lib/actions/assets";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AssetsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const assets = await listAssets();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Assets" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                Manage real estate, private equity, public markets, and more.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/assets/new" label="Add Asset" /> : null}
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}</TableCell>
                      <TableCell>{asset.entity.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(asset.currentValue, asset.currency)}
                      </TableCell>
                      <TableCell>{formatDate(asset.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
`,

  "app/(platform)/assets/new/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateAssetForm } from "@/components/assets/create-asset-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewAssetPage() {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Asset" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateAssetForm entities={entities} />
      </main>
    </>
  );
}
`,

  "app/(platform)/assets/bank-details/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { listBankAccounts } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BankDetailsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const accounts = await listBankAccounts();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Bank Details" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Family bank account registry.</CardDescription>
            </div>
            {showAdd ? (
              <AddLinkButton href="/assets/bank-details/new" label="Add Bank Account" />
            ) : null}
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.accountName}</TableCell>
                      <TableCell>{account.bankName}</TableCell>
                      <TableCell>{account.accountNumber}</TableCell>
                      <TableCell>{account.iban ?? "—"}</TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell>{account.entity?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(account.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
`,

  "app/(platform)/assets/bank-details/new/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateBankForm } from "@/components/bank/create-bank-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewBankAccountPage() {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Bank Account" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateBankForm entities={entities} />
      </main>
    </>
  );
}
`,

  "app/(platform)/documents/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { listDocuments } from "@/lib/actions/documents";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DocumentsPage() {
  const ctx = await requireModuleAccess("DOCUMENTS");
  const [documents, entities] = await Promise.all([listDocuments(), listEntities()]);
  const showUpload = canWrite(ctx, "DOCUMENTS");

  return (
    <>
      <PlatformHeader title="Document Vault" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {showUpload ? <UploadDocumentForm entities={entities} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Secure storage for KYC, legal, and corporate documents.</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {doc.name}
                        </a>
                      </TableCell>
                      <TableCell>{DOCUMENT_CATEGORY_LABELS[doc.category] ?? doc.category}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.entity?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                      <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
`,

  "app/(platform)/expenses/page.tsx": `import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateExpenseForm } from "@/components/expenses/create-expense-form";
import { listExpenses } from "@/lib/actions/expenses";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ExpensesPage() {
  const ctx = await requireModuleAccess("EXPENSES");
  const [expenses, entities] = await Promise.all([listExpenses(), listEntities()]);
  const showCreate = canWrite(ctx, "EXPENSES");

  return (
    <>
      <PlatformHeader title="Expenses" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {showCreate ? <CreateExpenseForm entities={entities} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track recurring and one-time expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EXPENSE_STATUS_LABELS[expense.status] ?? expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell>{formatDate(expense.dueDate)}</TableCell>
                      <TableCell>{expense.isRecurring ? "Yes" : "No"}</TableCell>
                      <TableCell>{expense.entity?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
`,
};

for (const [relativePath, content] of Object.entries(files)) {
  w(relativePath, content);
}

console.log("Created " + Object.keys(files).length + " module files:");
for (const relativePath of Object.keys(files)) {
  console.log("  - " + relativePath);
}
