/**
 * Opportunity fixture tests.
 *
 * Two jobs:
 *
 *   1. Keep the fixture data internally consistent. A record with the wrong
 *      decimals or a bad address would produce a wrong transfer amount or a
 *      failed call, and it would do so quietly.
 *   2. Assert that each fixture actually trips the rule it claims to in its
 *      `demonstrates` note. A demo set that silently stops demonstrating
 *      anything is worse than no demo set, because nobody notices.
 */

import { describe, expect, it } from "vitest";
import {
  BASE_SEPOLIA_EURC,
  BASE_SEPOLIA_USDC,
  BASE_SEPOLIA_WETH,
  buildCanonicalAction,
  getOpportunity,
  listOpportunities,
} from "./source";
import { evaluate } from "../policy/engine";
import { DEFAULT_POLICY } from "../policy/defaults";
import { BASE_SEPOLIA_CHAIN_ID, type EvaluationContext } from "../policy/types";

const NOW = new Date("2026-09-20T12:00:00.000Z");

/** An empty context — no history, nothing deployed. */
const CTX: EvaluationContext = {
  now: NOW,
  recentActions: [],
  openExposureAtomic: 0n,
};

/** A small, safely-within-limits amount for each token's decimals. */
function smallAmount(decimals: number): bigint {
  return 10n ** BigInt(decimals) / 100n; // 0.01 tokens
}

/** A balance large enough that allocation is never the binding constraint. */
function bigBalance(decimals: number): bigint {
  return 10n ** BigInt(decimals) * 1000n; // 1000 tokens
}

describe("fixture integrity", () => {
  const all = listOpportunities();

  it("ships more than one opportunity", () => {
    expect(all.length).toBeGreaterThan(1);
  });

  it("gives every opportunity a unique id", () => {
    const ids = all.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every record as seeded, so nothing mistakes it for live data", () => {
    for (const o of all) expect(o.dataSource).toBe("SEEDED");
  });

  it("puts every opportunity on Base Sepolia and nowhere else", () => {
    for (const o of all) expect(o.chainId).toBe(BASE_SEPOLIA_CHAIN_ID);
  });

  it("uses only real, known token addresses", () => {
    const known = new Set([
      BASE_SEPOLIA_USDC.toLowerCase(),
      BASE_SEPOLIA_EURC.toLowerCase(),
      BASE_SEPOLIA_WETH.toLowerCase(),
    ]);
    for (const o of all) {
      expect(/^0x[a-fA-F0-9]{40}$/.test(o.tokenAddress)).toBe(true);
      expect(known.has(o.tokenAddress.toLowerCase())).toBe(true);
    }
  });

  it("pairs each token with its correct decimals", () => {
    const expected: Record<string, number> = { USDC: 6, EURC: 6, WETH: 18 };
    for (const o of all) expect(o.tokenDecimals).toBe(expected[o.tokenSymbol]);
  });

  it("gives every opportunity a non-empty protocol, description and rationale", () => {
    for (const o of all) {
      expect(o.protocol.trim()).not.toBe("");
      expect(o.description.trim()).not.toBe("");
      expect(o.demonstrates.trim()).not.toBe("");
    }
  });

  it("keeps APYs in a sane range", () => {
    for (const o of all) {
      expect(o.estimatedApyBps).toBeGreaterThan(0);
      expect(o.estimatedApyBps).toBeLessThan(10_000); // under 100%
    }
  });

  it("borrows no real organisation's name for invented numbers", () => {
    const realProtocols = [
      "aave", "compound", "curve", "uniswap", "morpho", "maker",
      "lido", "yearn", "pendle", "spark", "moonwell",
    ];
    for (const o of all) {
      const name = o.protocol.toLowerCase();
      for (const real of realProtocols) expect(name).not.toContain(real);
    }
  });

  it("returns copies, so a caller cannot mutate the fixture set", () => {
    const first = listOpportunities()[0];
    first.risk = "HIGH";
    expect(listOpportunities()[0].risk).not.toBe("HIGH");
  });

  it("looks up by id and returns null for an unknown one", () => {
    expect(getOpportunity(all[0].id)?.id).toBe(all[0].id);
    expect(getOpportunity("nope")).toBeNull();
  });
});

describe("each fixture trips the rule it claims to", () => {
  /**
   * Evaluates one fixture with an amount well inside every numeric limit, so
   * only its categorical properties can decide the outcome.
   *
   * @param id - The opportunity id.
   * @returns The verdict.
   */
  function judge(id: string) {
    const o = getOpportunity(id)!;
    return evaluate(
      buildCanonicalAction(
        o,
        smallAmount(o.tokenDecimals),
        bigBalance(o.tokenDecimals),
      ),
      DEFAULT_POLICY,
      CTX,
    );
  }

  it("approves the stable reserve — the baseline", () => {
    expect(judge("opp-stable-reserve").decision).toBe("APPROVED");
  });

  it("approves the balanced pool sitting exactly on the default ceilings", () => {
    expect(judge("opp-balanced-pool").decision).toBe("APPROVED");
  });

  it("rejects the volatile strategy on risk", () => {
    const v = judge("opp-volatile-strategy");
    expect(v.decision).toBe("REJECTED");
    expect(v.violations.map((x) => x.code)).toContain("RISK_ABOVE_MAX");
  });

  it("rejects the locked vault on liquidity, despite its LOW risk", () => {
    const v = judge("opp-locked-vault");
    expect(v.decision).toBe("REJECTED");
    expect(v.violations.map((x) => x.code)).toContain("LIQUIDITY_BELOW_MIN");
    expect(v.violations.map((x) => x.code)).not.toContain("RISK_ABOVE_MAX");
  });

  it("rejects the carry trade on leverage alone, every other rule passing", () => {
    const v = judge("opp-leveraged-carry");
    expect(v.decision).toBe("REJECTED");
    expect(v.violations.map((x) => x.code)).toEqual(["LEVERAGE_NOT_ALLOWED"]);
  });

  it("approves the euro reserve — policy cannot see currency risk", () => {
    expect(judge("opp-euro-reserve").decision).toBe("APPROVED");
  });

  it("produces a mix of outcomes, so the demo set actually demonstrates", () => {
    const decisions = listOpportunities().map((o) => judge(o.id).decision);
    expect(decisions).toContain("APPROVED");
    expect(decisions).toContain("REJECTED");
  });
});

describe("buildCanonicalAction", () => {
  it("copies the judged fields from the record, not from its arguments", () => {
    const o = getOpportunity("opp-volatile-strategy")!;
    const action = buildCanonicalAction(o, 1n, 100n);
    expect(action.risk).toBe(o.risk);
    expect(action.liquidity).toBe(o.liquidity);
    expect(action.usesLeverage).toBe(o.usesLeverage);
    expect(action.protocol).toBe(o.protocol);
    expect(action.chainId).toBe(o.chainId);
  });

  it("takes only three parameters — there is no assessment to pass", () => {
    expect(buildCanonicalAction.length).toBe(3);
  });
});
