/**
 * Policy engine tests.
 *
 * The engine is the only component that authorises anything, so these are the
 * tests that matter most. They concentrate on the boundaries where a sloppy
 * implementation silently approves: exactly-at-cap, one atomic unit over, a
 * malformed policy, a history row with an unreadable date, and the brief's
 * canonical case of SERV recommending 25% against a 20% cap.
 */

import { describe, expect, it } from "vitest";
import { evaluate } from "./engine";
import {
  BASE_SEPOLIA_CHAIN_ID,
  type CanonicalAction,
  type EvaluationContext,
  type RiskPolicy,
} from "./types";

/** A conservative baseline policy — Milestone 1 fields only. */
const POLICY: RiskPolicy = {
  maxAllocationPercent: 20,
  maxRisk: "MEDIUM",
  minLiquidity: "MEDIUM",
  leverageAllowed: false,
  autoExecute: true,
};

/** 1000 USDC at six decimals. */
const BALANCE = 1_000_000_000n;
const NOW = new Date("2026-09-20T12:00:00.000Z");

/**
 * Builds a compliant action, with overrides.
 *
 * @param overrides - Fields to replace.
 * @returns The action.
 */
function action(overrides: Partial<CanonicalAction> = {}): CanonicalAction {
  return {
    opportunityId: "opp-test",
    protocol: "Testnet lending pool",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "USDC",
    amountAtomic: 100_000_000n, // 10% of balance
    walletBalanceAtomic: BALANCE,
    risk: "LOW",
    liquidity: "HIGH",
    usesLeverage: false,
    ...overrides,
  };
}

/**
 * Builds an evaluation context, with overrides.
 *
 * @param overrides - Fields to replace.
 * @returns The context.
 */
function ctx(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return {
    now: NOW,
    recentActions: [],
    openExposureAtomic: 0n,
    ...overrides,
  };
}

/**
 * Timestamp a given number of hours before NOW.
 *
 * @param hours - Hours back.
 * @returns ISO string.
 */
function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

describe("approval", () => {
  it("approves an action inside every constraint", () => {
    const verdict = evaluate(action(), POLICY);
    expect(verdict.decision).toBe("APPROVED");
    expect(verdict.violations).toEqual([]);
    expect(verdict.allocationBps).toBe(1000);
  });

  it("approves an allocation exactly at the cap", () => {
    const verdict = evaluate(action({ amountAtomic: 200_000_000n }), POLICY);
    expect(verdict.decision).toBe("APPROVED");
    expect(verdict.allocationBps).toBe(2000);
  });

  it("flags manual approval when autoExecute is off, without rejecting", () => {
    const verdict = evaluate(action(), { ...POLICY, autoExecute: false });
    expect(verdict.decision).toBe("APPROVED");
    expect(verdict.requiresManualApproval).toBe(true);
  });

  it("reports which constraints it actually evaluated", () => {
    const verdict = evaluate(action(), POLICY);
    expect(verdict.evaluated).toContain("maxAllocationPercent");
    expect(verdict.evaluated).not.toContain("cooldownSeconds");
  });
});

describe("the per-action allocation cap", () => {
  it("rejects 25% against a 20% cap — the case SERV must not be able to win", () => {
    const verdict = evaluate(action({ amountAtomic: 250_000_000n }), POLICY);
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("ALLOCATION_EXCEEDS_CAP");
  });

  it("rejects an allocation one atomic unit over the cap", () => {
    const verdict = evaluate(action({ amountAtomic: 200_000_001n }), POLICY);
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("ALLOCATION_EXCEEDS_CAP");
  });

  it("does not round a fractional overage down into compliance", () => {
    // 3/14 = 21.43%, over the 20% cap. Integer division would floor to 21%.
    const verdict = evaluate(
      action({ amountAtomic: 3n, walletBalanceAtomic: 14n }),
      POLICY,
    );
    expect(verdict.decision).toBe("REJECTED");
  });
});

describe("risk, liquidity, leverage, chain", () => {
  it("rejects a leveraged action when leverage is not allowed", () => {
    const verdict = evaluate(action({ usesLeverage: true }), POLICY);
    expect(verdict.violations.map((v) => v.code)).toContain("LEVERAGE_NOT_ALLOWED");
  });

  it("permits a leveraged action only when the policy says so", () => {
    expect(
      evaluate(action({ usesLeverage: true }), { ...POLICY, leverageAllowed: true })
        .decision,
    ).toBe("APPROVED");
  });

  it("rejects risk above the policy maximum", () => {
    expect(
      evaluate(action({ risk: "HIGH" }), POLICY).violations.map((v) => v.code),
    ).toContain("RISK_ABOVE_MAX");
  });

  it("rejects liquidity below the policy minimum", () => {
    expect(
      evaluate(action({ liquidity: "LOW" }), POLICY).violations.map((v) => v.code),
    ).toContain("LIQUIDITY_BELOW_MIN");
  });

  it("rejects any chain that is not Base Sepolia", () => {
    expect(
      evaluate(action({ chainId: 8453 }), POLICY).violations.map((v) => v.code),
    ).toContain("UNSUPPORTED_CHAIN");
  });

  it("rejects a non-positive amount", () => {
    expect(evaluate(action({ amountAtomic: 0n }), POLICY).decision).toBe("REJECTED");
    expect(evaluate(action({ amountAtomic: -1n }), POLICY).decision).toBe("REJECTED");
  });

  it("rejects an amount exceeding the wallet balance", () => {
    const verdict = evaluate(action({ amountAtomic: BALANCE + 1n }), {
      ...POLICY,
      maxAllocationPercent: 100,
    });
    expect(verdict.violations.map((v) => v.code)).toContain("INSUFFICIENT_BALANCE");
  });

  it("rejects when the wallet balance is zero, rather than dividing by it", () => {
    const verdict = evaluate(
      action({ walletBalanceAtomic: 0n, amountAtomic: 1n }),
      POLICY,
    );
    expect(verdict.violations.map((v) => v.code)).toContain("ZERO_BALANCE");
    expect(verdict.allocationBps).toBeNull();
  });
});

describe("total exposure across open positions", () => {
  const withCap: RiskPolicy = { ...POLICY, maxTotalExposurePercent: 50 };

  it("approves while cumulative exposure stays under the cap", () => {
    const verdict = evaluate(
      action({ amountAtomic: 100_000_000n }),
      withCap,
      ctx({ openExposureAtomic: 300_000_000n }), // 30% + 10% = 40%
    );
    expect(verdict.decision).toBe("APPROVED");
  });

  it("approves at exactly the cap", () => {
    const verdict = evaluate(
      action({ amountAtomic: 100_000_000n }),
      withCap,
      ctx({ openExposureAtomic: 400_000_000n }), // 40% + 10% = 50%
    );
    expect(verdict.decision).toBe("APPROVED");
  });

  it("rejects a compliant action that pushes cumulative exposure over the cap", () => {
    const verdict = evaluate(
      action({ amountAtomic: 100_000_000n }), // only 10% on its own — fine
      withCap,
      ctx({ openExposureAtomic: 450_000_000n }), // but 45% is already out
    );
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("TOTAL_EXPOSURE_EXCEEDED");
  });

  it("stops the drain: repeated per-action-compliant steps cannot empty the wallet", () => {
    // Without a cumulative limit, twenty 20% actions each pass and the wallet
    // ends at zero. With one, the run stops.
    let exposure = 0n;
    let approvals = 0;
    for (let i = 0; i < 20; i++) {
      const verdict = evaluate(
        action({ amountAtomic: 200_000_000n }), // exactly 20% every time
        withCap,
        ctx({ openExposureAtomic: exposure }),
      );
      if (verdict.decision !== "APPROVED") break;
      approvals++;
      exposure += 200_000_000n;
    }
    expect(approvals).toBe(2); // 20% + 20% = 40%; a third would breach 50%
    expect(exposure).toBeLessThan(BALANCE);
  });
});

describe("the reserve floor", () => {
  const withReserve: RiskPolicy = { ...POLICY, minReserveAtomic: 900_000_000n };

  it("approves while the remaining balance stays above the reserve", () => {
    expect(
      evaluate(action({ amountAtomic: 50_000_000n }), withReserve).decision,
    ).toBe("APPROVED");
  });

  it("approves when the remainder lands exactly on the reserve", () => {
    expect(
      evaluate(action({ amountAtomic: 100_000_000n }), withReserve).decision,
    ).toBe("APPROVED");
  });

  it("rejects an action that would dip below the reserve by one unit", () => {
    const verdict = evaluate(action({ amountAtomic: 100_000_001n }), withReserve);
    expect(verdict.violations.map((v) => v.code)).toContain("RESERVE_BREACHED");
  });

  it("holds a floor that a pure percentage cap cannot — a shrinking balance still stops", () => {
    // 20% of a shrinking balance is always "allowed", so percentages alone
    // never finish draining. An absolute floor does.
    const verdict = evaluate(
      action({ amountAtomic: 180_000_000n, walletBalanceAtomic: 950_000_000n }),
      withReserve,
    );
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("RESERVE_BREACHED");
  });
});

describe("rate limits", () => {
  it("rejects once the daily action count is reached", () => {
    const policy: RiskPolicy = { ...POLICY, maxActionsPerDay: 3 };
    const recent = [
      { at: hoursAgo(1), amountAtomic: 1n, opportunityId: "a" },
      { at: hoursAgo(5), amountAtomic: 1n, opportunityId: "b" },
      { at: hoursAgo(9), amountAtomic: 1n, opportunityId: "c" },
    ];
    const verdict = evaluate(action(), policy, ctx({ recentActions: recent }));
    expect(verdict.violations.map((v) => v.code)).toContain("DAILY_ACTION_LIMIT_REACHED");
  });

  it("ignores actions older than 24 hours", () => {
    const policy: RiskPolicy = { ...POLICY, maxActionsPerDay: 1 };
    const recent = [{ at: hoursAgo(25), amountAtomic: 1n, opportunityId: "old" }];
    expect(
      evaluate(action(), policy, ctx({ recentActions: recent })).decision,
    ).toBe("APPROVED");
  });

  it("rejects when the rolling 24-hour deployment cap would be exceeded", () => {
    const policy: RiskPolicy = { ...POLICY, maxDailyDeployedPercent: 25 };
    const recent = [
      { at: hoursAgo(2), amountAtomic: 150_000_000n, opportunityId: "a" },
    ];
    // 15% already + 10% now = 25%... one unit more breaks it.
    const verdict = evaluate(
      action({ amountAtomic: 100_000_001n }),
      policy,
      ctx({ recentActions: recent }),
    );
    expect(verdict.violations.map((v) => v.code)).toContain("DAILY_DEPLOY_CAP_EXCEEDED");
  });

  it("allows the daily deployment cap to be met exactly", () => {
    const policy: RiskPolicy = { ...POLICY, maxDailyDeployedPercent: 25 };
    const recent = [
      { at: hoursAgo(2), amountAtomic: 150_000_000n, opportunityId: "a" },
    ];
    expect(
      evaluate(action({ amountAtomic: 100_000_000n }), policy, ctx({ recentActions: recent }))
        .decision,
    ).toBe("APPROVED");
  });

  it("rejects while the cooldown is still running", () => {
    const policy: RiskPolicy = { ...POLICY, cooldownSeconds: 3600 };
    const recent = [{ at: hoursAgo(0.25), amountAtomic: 1n, opportunityId: "a" }];
    const verdict = evaluate(action(), policy, ctx({ recentActions: recent }));
    expect(verdict.violations.map((v) => v.code)).toContain("COOLDOWN_ACTIVE");
  });

  it("approves once the cooldown has elapsed", () => {
    const policy: RiskPolicy = { ...POLICY, cooldownSeconds: 3600 };
    const recent = [{ at: hoursAgo(2), amountAtomic: 1n, opportunityId: "a" }];
    expect(
      evaluate(action(), policy, ctx({ recentActions: recent })).decision,
    ).toBe("APPROVED");
  });

  it("approves when there is no history at all", () => {
    const policy: RiskPolicy = { ...POLICY, cooldownSeconds: 3600, maxActionsPerDay: 1 };
    expect(evaluate(action(), policy, ctx()).decision).toBe("APPROVED");
  });
});

describe("protocol lists", () => {
  it("rejects a blocked protocol", () => {
    const policy: RiskPolicy = {
      ...POLICY,
      blockedProtocols: ["Testnet lending pool"],
    };
    expect(
      evaluate(action(), policy).violations.map((v) => v.code),
    ).toContain("PROTOCOL_BLOCKED");
  });

  it("rejects a protocol absent from the allowlist", () => {
    const policy: RiskPolicy = { ...POLICY, allowedProtocols: ["Something else"] };
    expect(
      evaluate(action(), policy).violations.map((v) => v.code),
    ).toContain("PROTOCOL_NOT_ALLOWED");
  });

  it("approves a protocol on the allowlist", () => {
    const policy: RiskPolicy = {
      ...POLICY,
      allowedProtocols: ["Testnet lending pool"],
    };
    expect(evaluate(action(), policy).decision).toBe("APPROVED");
  });

  it("treats an empty allowlist as permitting nothing, not everything", () => {
    const policy: RiskPolicy = { ...POLICY, allowedProtocols: [] };
    expect(evaluate(action(), policy).decision).toBe("REJECTED");
  });

  it("lets the blocklist win over the allowlist", () => {
    const policy: RiskPolicy = {
      ...POLICY,
      allowedProtocols: ["Testnet lending pool"],
      blockedProtocols: ["Testnet lending pool"],
    };
    expect(
      evaluate(action(), policy).violations.map((v) => v.code),
    ).toContain("PROTOCOL_BLOCKED");
  });
});

describe("failing closed", () => {
  it("refuses when the policy needs context and none was supplied", () => {
    const policy: RiskPolicy = { ...POLICY, maxActionsPerDay: 3 };
    const verdict = evaluate(action(), policy);
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("CONTEXT_REQUIRED");
  });

  it("refuses when a history row has an unreadable timestamp", () => {
    const policy: RiskPolicy = { ...POLICY, maxActionsPerDay: 3 };
    const recent = [{ at: "sometime last week", amountAtomic: 1n, opportunityId: "a" }];
    const verdict = evaluate(action(), policy, ctx({ recentActions: recent }));
    expect(verdict.decision).toBe("REJECTED");
    expect(verdict.violations.map((v) => v.code)).toContain("MALFORMED_CONTEXT");
  });

  it("refuses an invalid now", () => {
    const policy: RiskPolicy = { ...POLICY, cooldownSeconds: 60 };
    const verdict = evaluate(action(), policy, ctx({ now: new Date("nonsense") }));
    expect(verdict.decision).toBe("REJECTED");
  });

  it("rejects a malformed policy instead of falling back to a default", () => {
    const verdict = evaluate(action(), { ...POLICY, maxAllocationPercent: 20.5 });
    expect(verdict.violations.map((v) => v.code)).toContain("MALFORMED_POLICY");
  });

  it("rejects a policy cap outside 0-100", () => {
    expect(
      evaluate(action(), { ...POLICY, maxAllocationPercent: 150 }).decision,
    ).toBe("REJECTED");
    expect(
      evaluate(action(), { ...POLICY, maxAllocationPercent: -5 }).decision,
    ).toBe("REJECTED");
  });

  it("rejects a negative reserve", () => {
    expect(
      evaluate(action(), { ...POLICY, minReserveAtomic: -1n }).decision,
    ).toBe("REJECTED");
  });

  it("rejects a malformed action instead of coercing it", () => {
    const bad = action() as unknown as Record<string, unknown>;
    bad.amountAtomic = 100;
    const verdict = evaluate(bad as unknown as CanonicalAction, POLICY);
    expect(verdict.violations.map((v) => v.code)).toContain("MALFORMED_ACTION");
  });

  it("rejects an action with no protocol", () => {
    const verdict = evaluate(action({ protocol: "" }), POLICY);
    expect(verdict.violations.map((v) => v.code)).toContain("MALFORMED_ACTION");
  });

  it("never throws, whatever it is handed", () => {
    const hostile = [undefined, null, {}, { amountAtomic: "lots" }, []];
    for (const value of hostile) {
      expect(() => evaluate(value as unknown as CanonicalAction, POLICY)).not.toThrow();
      expect(evaluate(value as unknown as CanonicalAction, POLICY).decision).toBe(
        "REJECTED",
      );
    }
  });

  it("survives a hostile context without throwing", () => {
    const policy: RiskPolicy = { ...POLICY, maxActionsPerDay: 1 };
    const hostile = [
      null,
      {},
      { now: NOW, recentActions: "nope", openExposureAtomic: 0n },
      { now: NOW, recentActions: [null], openExposureAtomic: 0n },
    ];
    for (const value of hostile) {
      expect(() =>
        evaluate(action(), policy, value as unknown as EvaluationContext),
      ).not.toThrow();
      expect(
        evaluate(action(), policy, value as unknown as EvaluationContext).decision,
      ).toBe("REJECTED");
    }
  });

  it("reports every violated constraint, not just the first", () => {
    const verdict = evaluate(
      action({
        amountAtomic: 900_000_000n,
        risk: "HIGH",
        liquidity: "LOW",
        usesLeverage: true,
        protocol: "Banned protocol",
      }),
      { ...POLICY, blockedProtocols: ["Banned protocol"], minReserveAtomic: 500_000_000n },
    );
    const codes = verdict.violations.map((v) => v.code);
    expect(codes).toContain("ALLOCATION_EXCEEDS_CAP");
    expect(codes).toContain("RISK_ABOVE_MAX");
    expect(codes).toContain("LIQUIDITY_BELOW_MIN");
    expect(codes).toContain("LEVERAGE_NOT_ALLOWED");
    expect(codes).toContain("PROTOCOL_BLOCKED");
    expect(codes).toContain("RESERVE_BREACHED");
  });

  it("is deterministic — same inputs, same verdict", () => {
    const policy: RiskPolicy = {
      ...POLICY,
      maxTotalExposurePercent: 50,
      maxActionsPerDay: 5,
      cooldownSeconds: 60,
    };
    const a = action({ amountAtomic: 250_000_000n });
    const c = ctx({
      recentActions: [{ at: hoursAgo(3), amountAtomic: 5n, opportunityId: "x" }],
      openExposureAtomic: 100_000_000n,
    });
    const first = JSON.stringify(evaluate(a, policy, c));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(evaluate(a, policy, c))).toBe(first);
    }
  });
});
