import { describe, expect, it } from "vitest";
import { MANAGEABLE_MODULES } from "@/lib/admin/user-options";
import { ALL_MODULE_NAMES } from "@/lib/permissions/modules";

describe("module access configuration", () => {
  it("lists every module in the user override UI", () => {
    const manageable = MANAGEABLE_MODULES.map((item) => item.module).sort();
    expect(manageable).toEqual([...ALL_MODULE_NAMES].sort());
  });
});
