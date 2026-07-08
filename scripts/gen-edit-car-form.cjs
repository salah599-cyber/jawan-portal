const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(
  path.join(__dirname, "../components/cars/create-car-form.tsx"),
  "utf8"
);

let s = src
  .replace(/createCar/g, "UPDATE_CAR_PLACEHOLDER")
  .replace(/CreateCarForm/g, "EditCarForm")
  .replace("Register Oman Vehicle", "Edit Vehicle")
  .replace("Register Vehicle", "Save Changes")
  .replace("Registering...", "Saving...")
  .replace("Failed to register vehicle", "Failed to update vehicle");

s = s.replace(
  'export function EditCarForm({ entities }: { entities: EntityOption[] }) {',
  `type CarRecord = {
  id: string;
  name: string;
  plateNumber: string;
  plateCode: string | null;
  governorate: string;
  wilayat: string;
  make: string;
  model: string;
  modelYear: number | null;
  color: string | null;
  vehicleClass: string | null;
  bodyType: string | null;
  fuelType: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  mulkiaNumber: string | null;
  registeredOwner: string | null;
  registrationIssueDate: Date | null;
  registrationExpiryDate: Date | null;
  insuranceCompany: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiryDate: Date | null;
  entityId: string;
  status: string;
  currency: string;
  ownershipPct: { toString(): string };
  acquisitionDate: Date | null;
  acquisitionCost: { toString(): string } | null;
  currentValue: { toString(): string } | null;
  notes: string | null;
};

export function EditCarForm({ car, entities }: { car: CarRecord; entities: EntityOption[] }) {`
);

s = s.replace(
  'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
  'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";\nimport { formatDateInput, formatDecimalInput } from "@/lib/format";'
);

s = s.replace(
  'import { UPDATE_CAR_PLACEHOLDER } from "@/lib/actions/cars";',
  'import { updateCar } from "@/lib/actions/cars";'
);

s = s.replace("useState(OMAN_GOVERNORATES[0])", "useState(car.governorate)");
s = s.replace(
  'useState(getWilayatsForGovernorate(OMAN_GOVERNORATES[0])[0] ?? "")',
  "useState(car.wilayat)"
);
s = s.replace('useState("ACTIVE")', "useState(car.status)");
s = s.replace('useState(entities[0]?.id ?? "")', "useState(car.entityId)");
s = s.replace('useState("PRIVATE")', 'useState(car.vehicleClass ?? "PRIVATE")');
s = s.replace('useState("SUV")', 'useState(car.bodyType ?? "SUV")');
s = s.replace('useState("PETROL")', 'useState(car.fuelType ?? "PETROL")');
s = s.replace('useState("OMR")', "useState(car.currency)");

s = s.replace(
  "const car = await UPDATE_CAR_PLACEHOLDER(formData);",
  "await updateCar(car.id, formData);"
);

s = s.replace(/function FileSection[\s\S]*?\n\}\n\n/, "");
s = s.replace(
  /\n          <div className="md:col-span-2"><p className="mb-3 text-sm font-medium">Documents[\s\S]*?<FileSection id="otherFiles"[\s\S]*?\/>\n\n/,
  "\n"
);

const defaults = [
  [
    'id="name" name="name" required placeholder="e.g. Family Land Cruiser"',
    'id="name" name="name" required defaultValue={car.name}',
  ],
  [
    'id="plateNumber" name="plateNumber" required placeholder="e.g. 12345"',
    'id="plateNumber" name="plateNumber" required defaultValue={car.plateNumber}',
  ],
  [
    'id="plateCode" name="plateCode" placeholder="e.g. B, AA, M"',
    'id="plateCode" name="plateCode" defaultValue={car.plateCode ?? ""}',
  ],
  [
    'id="make" name="make" required placeholder="e.g. Toyota"',
    'id="make" name="make" required defaultValue={car.make}',
  ],
  [
    'id="model" name="model" required placeholder="e.g. Land Cruiser"',
    'id="model" name="model" required defaultValue={car.model}',
  ],
  [
    'id="modelYear" name="modelYear" type="number" min="1980" max="2100"',
    'id="modelYear" name="modelYear" type="number" min="1980" max="2100" defaultValue={car.modelYear ?? ""}',
  ],
  ['id="color" name="color" />', 'id="color" name="color" defaultValue={car.color ?? ""} />'],
  [
    'id="mulkiaNumber" name="mulkiaNumber" />',
    'id="mulkiaNumber" name="mulkiaNumber" defaultValue={car.mulkiaNumber ?? ""} />',
  ],
  [
    'id="chassisNumber" name="chassisNumber" />',
    'id="chassisNumber" name="chassisNumber" defaultValue={car.chassisNumber ?? ""} />',
  ],
  [
    'id="engineNumber" name="engineNumber" />',
    'id="engineNumber" name="engineNumber" defaultValue={car.engineNumber ?? ""} />',
  ],
  [
    'id="registeredOwner" name="registeredOwner" />',
    'id="registeredOwner" name="registeredOwner" defaultValue={car.registeredOwner ?? ""} />',
  ],
  [
    'id="registrationIssueDate" name="registrationIssueDate" type="date" />',
    'id="registrationIssueDate" name="registrationIssueDate" type="date" defaultValue={formatDateInput(car.registrationIssueDate)} />',
  ],
  [
    'id="registrationExpiryDate" name="registrationExpiryDate" type="date" />',
    'id="registrationExpiryDate" name="registrationExpiryDate" type="date" defaultValue={formatDateInput(car.registrationExpiryDate)} />',
  ],
  [
    'id="insuranceCompany" name="insuranceCompany" />',
    'id="insuranceCompany" name="insuranceCompany" defaultValue={car.insuranceCompany ?? ""} />',
  ],
  [
    'id="insurancePolicyNumber" name="insurancePolicyNumber" />',
    'id="insurancePolicyNumber" name="insurancePolicyNumber" defaultValue={car.insurancePolicyNumber ?? ""} />',
  ],
  [
    'id="insuranceExpiryDate" name="insuranceExpiryDate" type="date" />',
    'id="insuranceExpiryDate" name="insuranceExpiryDate" type="date" defaultValue={formatDateInput(car.insuranceExpiryDate)} />',
  ],
  ['defaultValue="100"', "defaultValue={formatDecimalInput(car.ownershipPct)}"],
  [
    'id="acquisitionDate" name="acquisitionDate" type="date" />',
    'id="acquisitionDate" name="acquisitionDate" type="date" defaultValue={formatDateInput(car.acquisitionDate)} />',
  ],
  [
    'id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" />',
    'id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(car.acquisitionCost)} />',
  ],
  [
    'id="currentValue" name="currentValue" type="number" step="0.01" min="0" />',
    'id="currentValue" name="currentValue" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(car.currentValue)} />',
  ],
  [
    'id="notes" name="notes" rows={3} />',
    'id="notes" name="notes" rows={3} defaultValue={car.notes ?? ""} />',
  ],
];

for (const [a, b] of defaults) {
  s = s.replace(a, b);
}

fs.writeFileSync(path.join(__dirname, "../components/cars/edit-car-form.tsx"), s);
console.log("edit-car-form.tsx written");
