/**
 * Request validation tests.
 *
 * The amount parser gets the most attention: it is the one place where a
 * rounding error would turn into a wrong transfer.
 */

import { describe, expect, it } from "vitest";
import {
  ActionBodySchema,
  AssessBodySchema,
  PolicyBodySchema,
  parseBody,
  parseDecimalToAtomic,
  toRiskPolicy,
} from "./validate";

describe("parseDecimalToAtomic", () => {
  it("converts whole tokens", () => {
    expect(parseDecimalToAtomic("1", 6)).toBe(1_000_000n);
  });

  it("converts fractions", () => {
    expect(parseDecimalToAtomic("0.01", 6)).toBe(10_000n);
  });

  it("converts full precision", () => {
    expect(parseDecimalToAtomic("1.234567", 6)).toBe(1_234_567n);
  });

  it("pads short fractions correctly", () => {
    expect(parseDecimalToAtomic("0.1", 6)).toBe(100_000n);
  });

  it("handles zero", () => {
    expect(parseDecimalToAtomic("0", 6)).toBe(0n);
  });

  it("is exact where floating point is not", () => {
    // 0.07 * 10**6 evaluates to 70000.00000000001 in IEEE 754.
    expect(parseDecimalToAtomic("0.07", 6)).toBe(70_000n);
    // 0.29 * 10**2 evaluates to 28.999999999999996.
    expect(parseDecimalToAtomic("0.29", 2)).toBe(29n);
  });

  it("handles amounts far beyond Number.MAX_SAFE_INTEGER", () => {
    expect(parseDecimalToAtomic("9007199254740993.000001", 6)).toBe(
      9_007_199_254_740_993_000_001n,
    );
  });

  it("refuses to truncate excess precision", () => {
    expect(() => parseDecimalToAtomic("0.0000001", 6)).toThrow(/Refusing to truncate/);
  });
});

describe("ActionBodySchema", () => {
  it("accepts an opportunity and a decimal amount", () => {
    const r = parseBody(ActionBodySchema, { opportunityId: "o", amount: "0.01" });
    expect(r.ok).toBe(true);
  });

  it("accepts an atomic amount", () => {
    const r = parseBody(ActionBodySchema, { opportunityId: "o", amountAtomic: "10000" });
    expect(r.ok).toBe(true);
  });

  it("rejects both amount forms at once", () => {
    const r = parseBody(ActionBodySchema, {
      opportunityId: "o",
      amount: "0.01",
      amountAtomic: "10000",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects neither amount form", () => {
    expect(parseBody(ActionBodySchema, { opportunityId: "o" }).ok).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(
      parseBody(ActionBodySchema, { opportunityId: "o", amount: "-1" }).ok,
    ).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(
      parseBody(ActionBodySchema, { opportunityId: "o", amount: "all of it" }).ok,
    ).toBe(false);
  });

  it("REFUSES a caller-supplied risk band — the network-edge version of the SERV hole", () => {
    const r = parseBody(ActionBodySchema, {
      opportunityId: "o",
      amount: "0.01",
      risk: "LOW",
    });
    expect(r.ok).toBe(false);
  });

  it("REFUSES a caller-supplied balance", () => {
    const r = parseBody(ActionBodySchema, {
      opportunityId: "o",
      amount: "0.01",
      walletBalanceAtomic: "999999999999",
    });
    expect(r.ok).toBe(false);
  });

  it("REFUSES a caller-supplied leverage flag", () => {
    const r = parseBody(ActionBodySchema, {
      opportunityId: "o",
      amount: "0.01",
      usesLeverage: false,
    });
    expect(r.ok).toBe(false);
  });
});

describe("PolicyBodySchema", () => {
  const VALID = {
    maxAllocationPercent: 20,
    maxRisk: "MEDIUM",
    minLiquidity: "MEDIUM",
    leverageAllowed: false,
    autoExecute: true,
  };

  it("accepts a minimal policy", () => {
    expect(parseBody(PolicyBodySchema, VALID).ok).toBe(true);
  });

  it("accepts the optional limits", () => {
    const r = parseBody(PolicyBodySchema, {
      ...VALID,
      maxTotalExposurePercent: 50,
      minReserveAtomic: "900000000",
      maxActionsPerDay: 3,
      maxDailyDeployedPercent: 25,
      cooldownSeconds: 3600,
      allowedProtocols: ["a"],
      blockedProtocols: ["b"],
    });
    expect(r.ok).toBe(true);
  });

  it("converts minReserveAtomic to a bigint", () => {
    const r = parseBody(PolicyBodySchema, { ...VALID, minReserveAtomic: "900000000" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(toRiskPolicy(r.value as never).minReserveAtomic).toBe(900_000_000n);
    }
  });

  it("rejects a fractional percentage", () => {
    expect(
      parseBody(PolicyBodySchema, { ...VALID, maxAllocationPercent: 20.5 }).ok,
    ).toBe(false);
  });

  it("rejects a percentage above 100", () => {
    expect(
      parseBody(PolicyBodySchema, { ...VALID, maxAllocationPercent: 101 }).ok,
    ).toBe(false);
  });

  it("rejects an unknown field", () => {
    expect(parseBody(PolicyBodySchema, { ...VALID, sneaky: true }).ok).toBe(false);
  });

  it("rejects a bad enum", () => {
    expect(parseBody(PolicyBodySchema, { ...VALID, maxRisk: "EXTREME" }).ok).toBe(false);
  });

  it("rejects a reserve that is not a digit string", () => {
    expect(
      parseBody(PolicyBodySchema, { ...VALID, minReserveAtomic: 900000000 }).ok,
    ).toBe(false);
  });
});

describe("AssessBodySchema", () => {
  it("accepts an opportunity id", () => {
    expect(parseBody(AssessBodySchema, { opportunityId: "o" }).ok).toBe(true);
  });

  it("rejects an empty id", () => {
    expect(parseBody(AssessBodySchema, { opportunityId: "" }).ok).toBe(false);
  });

  it("rejects extra fields", () => {
    expect(
      parseBody(AssessBodySchema, { opportunityId: "o", extra: 1 }).ok,
    ).toBe(false);
  });
});
