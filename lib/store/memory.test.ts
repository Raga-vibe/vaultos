/**
 * Store tests.
 *
 * Exercised against the in-memory implementation. The Supabase one satisfies
 * the same interface; what is checked here is the contract both must honour.
 */

import { describe, expect, it } from "vitest";
import { createMemoryStore } from "./memory";
import type { RiskPolicy } from "../policy/types";

const POLICY: RiskPolicy = {
  maxAllocationPercent: 20,
  maxRisk: "MEDIUM",
  minLiquidity: "MEDIUM",
  leverageAllowed: false,
  autoExecute: true,
};

describe("policy storage", () => {
  it("returns null before anything is stored", async () => {
    expect(await createMemoryStore().getPolicy()).toBeNull();
  });

  it("round-trips a policy", async () => {
    const store = createMemoryStore();
    await store.setPolicy(POLICY);
    expect(await store.getPolicy()).toEqual(POLICY);
  });

  it("round-trips a bigint reserve without losing precision", async () => {
    const store = createMemoryStore();
    const big = 9_007_199_254_740_993_000_001n; // beyond Number.MAX_SAFE_INTEGER
    await store.setPolicy({ ...POLICY, minReserveAtomic: big });
    const back = await store.getPolicy();
    expect(back?.minReserveAtomic).toBe(big);
  });

  it("hands back a copy, so a caller cannot mutate stored state", async () => {
    const store = createMemoryStore();
    await store.setPolicy(POLICY);
    const first = await store.getPolicy();
    first!.maxAllocationPercent = 99;
    expect((await store.getPolicy())!.maxAllocationPercent).toBe(20);
  });
});

describe("audit storage", () => {
  it("appends and reads back in order", async () => {
    const store = createMemoryStore();
    for (let i = 1; i <= 3; i++) {
      await store.appendAudit({
        seq: i,
        at: new Date(2026, 0, i).toISOString(),
        type: "POLICY_EVALUATED",
        opportunityId: "o",
        detail: {},
        verdict: null,
      });
    }
    const events = await store.readAudit();
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it("honours a limit by returning the most recent", async () => {
    const store = createMemoryStore();
    for (let i = 1; i <= 5; i++) {
      await store.appendAudit({
        seq: i,
        at: new Date(2026, 0, i).toISOString(),
        type: "POLICY_EVALUATED",
        opportunityId: null,
        detail: {},
        verdict: null,
      });
    }
    expect((await store.readAudit(2)).map((e) => e.seq)).toEqual([4, 5]);
  });
});

describe("execution history", () => {
  it("returns only actions after the cutoff", async () => {
    const store = createMemoryStore();
    await store.recordExecution({
      at: "2026-09-19T12:00:00.000Z",
      amountAtomic: 1n,
      opportunityId: "old",
    });
    await store.recordExecution({
      at: "2026-09-20T12:00:00.000Z",
      amountAtomic: 2n,
      opportunityId: "new",
    });

    const recent = await store.readExecutions("2026-09-20T00:00:00.000Z");
    expect(recent.map((e) => e.opportunityId)).toEqual(["new"]);
  });

  it("KEEPS a row with an unreadable timestamp rather than dropping it", async () => {
    // Dropping it would hide the spend from the daily cap. The policy engine
    // rejects on an unreadable row; that is the correct place to fail.
    const store = createMemoryStore();
    await store.recordExecution({
      at: "not a date",
      amountAtomic: 5n,
      opportunityId: "broken",
    });
    const recent = await store.readExecutions("2026-09-20T00:00:00.000Z");
    expect(recent.map((e) => e.opportunityId)).toContain("broken");
  });

  it("preserves bigint amounts exactly", async () => {
    const store = createMemoryStore();
    const big = 123_456_789_012_345_678_901n;
    await store.recordExecution({
      at: "2026-09-20T12:00:00.000Z",
      amountAtomic: big,
      opportunityId: "o",
    });
    const [row] = await store.readExecutions("2026-09-19T00:00:00.000Z");
    expect(row.amountAtomic).toBe(big);
  });
});

describe("open exposure", () => {
  it("starts at zero", async () => {
    expect(await createMemoryStore().getOpenExposureAtomic()).toBe(0n);
  });

  it("round-trips a large value", async () => {
    const store = createMemoryStore();
    await store.setOpenExposureAtomic(987_654_321_098_765_432_109n);
    expect(await store.getOpenExposureAtomic()).toBe(987_654_321_098_765_432_109n);
  });
});
