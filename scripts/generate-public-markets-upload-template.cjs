/**
 * @deprecated Use scripts/generate-public-markets-upload-template.ts via npm run templates:public-markets
 */
const path = require("path");
const { execFileSync } = require("child_process");

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", path.join(__dirname, "generate-public-markets-upload-template.ts"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
