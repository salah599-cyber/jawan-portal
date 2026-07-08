const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log("wrote", rel);
}
const schemaPath = path.join(root, "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");
if (!schema.includes("LANDS")) {
  schema = schema.replace("enum ModuleName {\n  DASHBOARD\n  ASSETS\n  DOCUMENTS", "enum ModuleName {\n  DASHBOARD\n  ASSETS\n  LANDS\n  DOCUMENTS");
  schema = schema.replace("enum AssetCategory {", "enum LandDocumentType {\n  KROOKI\n  MULKIA\n  OTHER\n}\n\nenum AssetCategory {");
  schema = schema.replace("  expenses     Expense[]\n  userAccess   UserEntityAccess[]", "  expenses     Expense[]\n  landParcels  LandParcel[]\n  userAccess   UserEntityAccess[]");
  schema = schema.replace("  liabilities     Liability[]\n  createdAt       DateTime", "  liabilities     Liability[]\n  landParcel      LandParcel?\n  createdAt       DateTime");
  const oldRe = `model RealEstateDetail {
  id         String @id @default(cuid())
  assetId    String @unique
  asset      Asset  @relation(fields: [assetId], references: [id], onDelete: Cascade)
  titleDeed  String?
  plotNumber String?
  bua        String?
  location   String?
}`;
  const newRe = fs.readFileSync(path.join(__dirname, "land-models.prisma.txt"), "utf8");
  schema = schema.replace(oldRe, newRe);
  fs.writeFileSync(schemaPath, schema);
  console.log("schema updated");
}
