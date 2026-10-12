import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { detectBroker } from "@/lib/msx/detect-broker";
import { parsePdfReport } from "@/lib/msx/parse-pdf";
import {
  isUCapitalReport,
  parseUCapitalHoldingRow,
  resolveUCapitalSymbol,
} from "@/lib/msx/parse-ucapital";
import { planImportSymbolSync } from "@/lib/public-markets/import-scope";

const FIXTURE = path.join(
  process.cwd(),
  "tests/fixtures/public-markets/ucapital-murtadha-30-sep-2026.pdf",
);

describe("U-Capital statement parsing", () => {
  it("detects U-Capital reports and does not mis-label client names as Sultan Securities", () => {
    const fileName = "Monthly Report - Murtadha Ahmed Sultan 30 SEP 2026.pdf";
    const text = "Client ID : 10616\nwww.u-capital.net\nStatement Of Holdings as on 30/09/2026";
    expect(isUCapitalReport(fileName, text)).toBe(true);
    expect(detectBroker(fileName, text)).toBe("U Capital");
  });

  it("maps U-Capital table rows to correct quantities and values", () => {
    const holding = parseUCapitalHoldingRow([
      "AHLI BANK (ABOB) - 220",
      "OMR",
      "OM0000002200",
      "3,432,503",
      "0.191",
      "0.203",
      "654,277.092",
      "0.203",
      "696,798.109",
      "42,521.017",
      "0.000",
      "19,986.906",
      "62,507.923",
      "5.31%",
    ]);

    expect(holding).toMatchObject({
      symbol: "ABOB",
      quantity: 3432503,
      costBasis: 654277.092,
      marketPrice: 0.203,
      marketValue: 696798.109,
      unrealisedPnl: 42521.017,
      currency: "OMR",
    });
  });

  it("does not map bond rows onto equity tickers", () => {
    expect(resolveUCapitalSymbol("BANK MUSCAT PERPETUAL BONDS TIER 1 - 8954", "OM0000008892")).toBe(
      "S8892",
    );
    expect(resolveUCapitalSymbol("BANK MUSCAT SAOG - 279", "OM0000002796")).toBe("BKMB");
    expect(resolveUCapitalSymbol("NATIONAL BANK OF OMAN (NBO) - 148", "OM0000001483")).toBe("NBOB");
  });

  it("parses the attached monthly statement with statement figures", async () => {
    const buffer = fs.readFileSync(FIXTURE);
    const result = await parsePdfReport(
      buffer,
      "Monthly Report - Murtadha Ahmed Sultan 30 SEP 2026.pdf",
    );

    expect(result.broker).toBe("U Capital");
    expect(result.accountNumber).toBe("10616");
    expect(result.asOfDate?.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(result.holdings.length).toBeGreaterThan(30);

    const bySymbol = new Map(result.holdings.map((holding) => [holding.symbol, holding]));

    expect(bySymbol.get("ABOB")).toMatchObject({
      quantity: 3432503,
      marketPrice: 0.203,
      marketValue: 696798.109,
      costBasis: 654277.092,
    });
    expect(bySymbol.get("BKMB")).toMatchObject({
      quantity: 2520881,
      marketPrice: 0.424,
      marketValue: 1068853.544,
    });
    expect(bySymbol.get("OTEL")).toMatchObject({
      quantity: 904030,
      marketPrice: 1.369,
      marketValue: 1237617.07,
    });
    expect(bySymbol.get("SOHR")).toMatchObject({
      quantity: 7439080,
      marketPrice: 0.189,
      marketValue: 1405986.12,
    });
    expect(bySymbol.get("NBOB")).toMatchObject({
      quantity: 1220702,
      marketPrice: 0.492,
      marketValue: 600585.384,
    });
  });

  it("plans same-account re-import as update/replace by symbol", () => {
    const plan = planImportSymbolSync(
      ["ABOB", "OLDJUNK", "BKMB"],
      ["ABOB", "BKMB", "OTEL"],
    );
    expect(plan.toUpdate.sort()).toEqual(["ABOB", "BKMB"]);
    expect(plan.toCreate).toEqual(["OTEL"]);
    expect(plan.toDelete).toEqual(["OLDJUNK"]);
  });
});
