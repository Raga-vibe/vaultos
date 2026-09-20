/**
 * Offline spike: the decision matrix.
 *
 * Runs every seeded opportunity against several policies and prints the grid.
 * Needs no credentials and no network — the policy engine is pure, which is
 * exactly what makes this possible.
 *
 * This is the demo. It shows, in one screen, that the constraints are doing
 * real work: the same opportunity is approved under one policy and refused
 * under another, and each refusal names the rule that caused it.
 */

import { check, finish, heading, info, loadEnv } from "./_report";
import { evaluate } from "../lib/policy/engine";
import { DEFAULT_POLICY } from "../lib/policy/defaults";
import { buildCanonicalAction, listOpportunities } from "../lib/opportunities/source";
import type { EvaluationContext, RiskPolicy } from "../lib/policy/types";

loadEnv();
heading("SPIKE: policy decision matrix");
info("offline — no credentials or network required");

const NOW = new Date("2026-09-20T12:00:00.000Z");

const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const DIM = "\u001b[2m";
const BOLD = "\u001b[1m";
const RESET = "\u001b[0m";

/** Policies to compare. */
const POLICIES: Array<{ label: string; policy: RiskPolicy }> = [
  { label: "default (cautious)", policy: DEFAULT_POLICY },
  {
    label: "permissive",
    policy: {
      ...DEFAULT_POLICY,
      maxAllocationPercent: 50,
      maxRisk: "HIGH",
      minLiquidity: "LOW",
      leverageAllowed: true,
      autoExecute: true,
      maxTotalExposurePercent: 100,
      maxDailyDeployedPercent: 100,
      cooldownSeconds: 0,
    },
  },
  {
    label: "strict (LOW risk only)",
    policy: { ...DEFAULT_POLICY, maxRisk: "LOW", minLiquidity: "HIGH" },
  },
];

const ctx: EvaluationContext = {
  now: NOW,
  recentActions: [],
  openExposureAtomic: 0n,
};

const opportunities = listOpportunities();

/** Verdicts collected per policy, so the matrix can be asserted on. */
const grid = new Map<string, Map<string, string>>();

for (const { label, policy } of POLICIES) {
  grid.set(label, new Map());
  console.log(`\n  ${BOLD}Policy: ${label}${RESET}`);
  console.log(
    `  ${DIM}maxRisk=${policy.maxRisk} minLiquidity=${policy.minLiquidity} ` +
      `leverage=${policy.leverageAllowed} cap=${policy.maxAllocationPercent}%${RESET}`,
  );

  for (const o of opportunities) {
    const unit = 10n ** BigInt(o.tokenDecimals);
    const verdict = evaluate(
      buildCanonicalAction(o, unit / 100n, unit * 1000n), // 0.01 of 1000
      policy,
      ctx,
    );

    const approved = verdict.decision === "APPROVED";
    const mark = approved ? `${GREEN}APPROVED${RESET}` : `${RED}REJECTED${RESET}`;
    const reason = approved
      ? verdict.requiresManualApproval
        ? `${DIM}(awaiting human confirmation)${RESET}`
        : ""
      : `${DIM}${verdict.violations.map((v) => v.code).join(", ")}${RESET}`;

    grid.get(label)!.set(
      o.id,
      approved ? "APPROVED" : verdict.violations.map((v) => v.code).join(","),
    );

    console.log(`    ${mark}  ${o.name.padEnd(30)} ${reason}`);
  }
}

console.log(`\n  ${BOLD}Assertions${RESET}`);

const cautious = grid.get("default (cautious)")!;
const permissive = grid.get("permissive")!;
const strict = grid.get("strict (LOW risk only)")!;

check(
  cautious.get("opp-stable-reserve") === "APPROVED",
  "the cautious policy approves the stable reserve",
  `got ${cautious.get("opp-stable-reserve")}`,
);

check(
  cautious.get("opp-volatile-strategy")?.includes("RISK_ABOVE_MAX") ?? false,
  "the cautious policy refuses the volatile strategy on risk",
  `got ${cautious.get("opp-volatile-strategy")}`,
);

check(
  cautious.get("opp-locked-vault")?.includes("LIQUIDITY_BELOW_MIN") ?? false,
  "the cautious policy refuses the locked vault on liquidity",
  `got ${cautious.get("opp-locked-vault")}`,
);

check(
  cautious.get("opp-leveraged-carry") === "LEVERAGE_NOT_ALLOWED",
  "the carry trade is refused on leverage ALONE — every other rule passes",
  `got ${cautious.get("opp-leveraged-carry")}`,
);

check(
  [...permissive.values()].every((v) => v === "APPROVED"),
  "the permissive policy approves everything — the fixtures are not rigged to fail",
  `got ${[...permissive.values()].join(" | ")}`,
);

check(
  [...strict.values()].filter((v) => v === "APPROVED").length <
    [...cautious.values()].filter((v) => v === "APPROVED").length,
  "a stricter policy approves strictly fewer opportunities",
);

check(
  cautious.get("opp-volatile-strategy") !== permissive.get("opp-volatile-strategy"),
  "the SAME opportunity changes verdict when only the policy changes",
);

console.log(`\n  ${BOLD}What this shows${RESET}`);
console.log(
  `  ${DIM}The same opportunity changes verdict when the policy changes, and`,
);
console.log(`  every refusal names the rule responsible. The engine is doing`);
console.log(`  work, not rubber-stamping.${RESET}`);
console.log(
  `\n  ${DIM}No credentials were used. The policy engine is pure — no clock,`,
);
console.log(`  no network, no model. See lib/policy/engine.ts.${RESET}`);

finish();
