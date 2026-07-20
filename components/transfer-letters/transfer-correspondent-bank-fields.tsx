import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TransferCorrespondentBankValues = {
  correspondentBankName?: string;
  correspondentSwiftCode?: string;
  correspondentRoutingNumber?: string;
  correspondentFfcInstructions?: string;
};

type TransferCorrespondentBankFieldsProps = {
  values: TransferCorrespondentBankValues;
  onChange: (field: keyof TransferCorrespondentBankValues, value: string) => void;
};

export function TransferCorrespondentBankFields({
  values,
  onChange,
}: TransferCorrespondentBankFieldsProps) {
  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Correspondent Bank</p>
        <p className="text-xs text-muted-foreground">
          Optional intermediary bank details for international USD wires.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="correspondentBankName">Correspondent Bank Name</Label>
          <Input
            id="correspondentBankName"
            name="correspondentBankName"
            value={values.correspondentBankName ?? ""}
            onChange={(e) => onChange("correspondentBankName", e.target.value)}
            placeholder="e.g. JPMorgan Chase Bank, N.A."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="correspondentSwiftCode">Correspondent SWIFT / BIC</Label>
          <Input
            id="correspondentSwiftCode"
            name="correspondentSwiftCode"
            value={values.correspondentSwiftCode ?? ""}
            onChange={(e) => onChange("correspondentSwiftCode", e.target.value)}
            placeholder="CHASUS33"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="correspondentRoutingNumber">Correspondent Routing Number (ABA)</Label>
          <Input
            id="correspondentRoutingNumber"
            name="correspondentRoutingNumber"
            inputMode="numeric"
            value={values.correspondentRoutingNumber ?? ""}
            onChange={(e) => onChange("correspondentRoutingNumber", e.target.value)}
            placeholder="021000021"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="correspondentFfcInstructions">FFC Instructions</Label>
          <Textarea
            id="correspondentFfcInstructions"
            name="correspondentFfcInstructions"
            rows={3}
            value={values.correspondentFfcInstructions ?? ""}
            onChange={(e) => onChange("correspondentFfcInstructions", e.target.value)}
            placeholder="For Further Credit to Account Name, Account #1234567890"
          />
        </div>
      </div>
    </div>
  );
}
