/**
 * Offline spike: malformed-response handling and fail-closed behaviour.
 *
 * Needs no credentials and no network. This is the spike that proves the
 * security rule holds, so it must stay runnable by anyone reviewing the repo.
 *
 * Two groups:
 *   1. Eleven malformed SERV responses, each of which must be rejected.
 *   2. Two fail-closed assertions: a null assessment must not produce an
 *      approval, and a SERV response recommending 25% against a 20% cap must
 *      be rejected by the policy engine.
 */

import { check, finish, heading, info, loadEnv } from "./_report";
import { parseAssessment } from "../lib/serv/assess";
import { evaluate } from "../lib/policy/engine";
import { buildCanonicalAction, getOpportunity } from "../lib/opportunities/source";
import type { RiskPolicy } from "../lib/policy/types";

loadEnv();
heading("SPIKE: SERV malformed responses and fail-closed policy");
info("offline — no credentials or network required");

console.log("\n  Malformed SERV responses (all must be REJECTED)");

const VALID = {
  summary: "Low-risk stablecoin supply.",
  riskAssessment: "LOW",
  liquidityAssessment: "HIGH",
  recommendedAllocationPercent: 10,
  usesLeverage: false,
  rationale: "Unleveraged and withdrawable on demand.",
  concerns: [],
  confidence: "HIGH",
};

const malformed: Array<[string, unknown]> = [
  ["null content", null],
  ["undefined content", undefined],
  ["empty string", ""],
  ["prose instead of JSON", "Looks good to me, go ahead and invest."],
  ["truncated JSON", '{"summary":"partial","riskAssess'],
  ["JSON array instead of object", JSON.stringify([VALID])],
  ["JSON scalar instead of object", "42"],
  ["missing a required field", (() => { const { confidence: _c, ...rest } = VALID; void _c; return rest; })()],
  ["unexpected extra property", { ...VALID, shouldExecute: true }],
  ["out-of-vocabulary enum", { ...VALID, riskAssessment: "EXTREME" }],
  ["allocation above 100", { ...VALID, recommendedAllocationPercent: 250 }],
];

for (const [label, payload] of malformed) {
  let result: ReturnType<typeof parseAssessment>;
  try {
    result = parseAssessment(payload);
  } catch (error) {
    check(false, `rejects ${label}`, `threw instead of returning: ${String(error)}`);
    continue;
  }
  check(!result.ok, `rejects ${label}`, result.ok ? "ACCEPTED a malformed response" : undefined);
}

console.log("\n  Fail-closed assertions");

const opportunity = getOpportunity("opp-stable-reserve");
if (!opportunity) {
  check(false, "seeded opportunity is available", "getOpportunity returned null");
  finish();
}

const POLICY: RiskPolicy = {
  maxAllocationPercent: 20,
  maxRisk: "MEDIUM",
  minLiquidity: "MEDIUM",
  leverageAllowed: false,
  autoExecute: true,
};

const BALANCE = 1_000_000_000n; // 1000 USDC

// Assertion 1 — a null assessment must never yield an approval.
const nullAssessment = parseAssessment(null);
check(
  !nullAssessment.ok,
  "a null assessment does not parse",
  "a null assessment was accepted",
);

// The engine does not consume an assessment at all, so even with no usable
// assessment the decision is made on the canonical action alone. Verify that
// an unparseable assessment cannot be turned into an approval by any path.
const overCapAction = buildCanonicalAction(opportunity, 250_000_000n, BALANCE);
const nullVerdict = evaluate(overCapAction, POLICY);
check(
  nullVerdict.decision === "REJECTED",
  "with no usable assessment, an over-cap action is REJECTED",
  `decision was ${nullVerdict.decision}`,
);

// Assertion 2 — SERV recommending 25% against a 20% cap must be rejected.
const servSays25 = parseAssessment({
  ...VALID,
  recommendedAllocationPercent: 25,
  riskAssessment: "LOW",
  confidence: "HIGH",
  rationale: "I strongly recommend allocating 25% here. This is very safe.",
});

check(
  servSays25.ok,
  "a well-formed 25% recommendation parses (it is valid, just not binding)",
);

const verdict25 = evaluate(
  buildCanonicalAction(opportunity, 250_000_000n, BALANCE),
  POLICY,
);

check(
  verdict25.decision === "REJECTED",
  "SERV recommending 25% against a 20% cap is REJECTED",
  `decision was ${verdict25.decision}`,
);

check(
  verdict25.violations.some((v) => v.code === "ALLOCATION_EXCEEDS_CAP"),
  "the rejection names ALLOCATION_EXCEEDS_CAP",
  `violations: ${verdict25.violations.map((v) => v.code).join(", ") || "(none)"}`,
);

// And the structural guarantee behind it: the builder has no way to take an
// assessment at all.
check(
  buildCanonicalAction.length === 3,
  "buildCanonicalAction takes only (opportunity, amount, balance) — no assessment parameter exists",
  `arity was ${buildCanonicalAction.length}`,
);

finish();
