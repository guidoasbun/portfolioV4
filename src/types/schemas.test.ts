import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";

describe("testing framework smoke test", () => {
  it("jest works", () => {
    expect(1 + 1).toBe(2);
  });

  it("fast-check works", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
    );
  });
});
