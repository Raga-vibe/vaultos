/**
 * Request orchestration.
 *
 * The routes are deliberately thin; the sequencing lives here so it can be
 * read in one place and reasoned about as a whole.
 *
 * THE ORDER MATTERS AND IS NOT NEGOTIABLE
 *
 *   1. Look the opportunity up in OUR records.
 *   2. Read the balance from the CHAIN.
 *   3. Build the canonical action from (1) and (2) only.
 *   4. Evaluate it against the stored policy.
 *   5. Execute only if the verdict is APPROVED and autoExecute is on.
 *
 * A SERV assessment may be requested alongside, and is attached to the
 * response and the audit log for the user to read. It is never an input to
 * step 3 or step 4. The assessment can be absent, wrong, or adversarial
 * without changing any outcome.
 */

import { assertServer } from "../server-guard";
import { append } from "../audit/log";
import { evaluate } from "../policy/engine";
import { DEFAULT_POLICY } from "../policy/defaults";
import { getStore } from "../store";
import {
  buildCanonicalAction,
  getOpportunity,
  type Opportunity,
} from "../opportunities/source";
import { getTokenBalanceAtomic } from "../agentkit/execute";
import { parseDecimalToAtomic } from "./validate";
import type {
  CanonicalAction,
  EvaluationContext,
  PolicyVerdict,
  RiskPolicy,
} from "../policy/types";

assertServer("lib/api/flow.ts");

/** Milliseconds in 24 hours. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything a caller needs to understand a decision. */
export type DecisionResult = {
  opportunity: Opportunity;
  action: CanonicalAction;
  policy: RiskPolicy;
  verdict: PolicyVerdict;
  context: { now: string; recentActionCount: number; openExposureAtomic: bigint };
};

/** Failure to even reach a decision. */
export type FlowFailure = { ok: false; reason: string; status: number };

/**
 * Reads the stored policy, falling back to the conservative default.
 *
 * @returns The active policy.
 */
export async function activePolicy(): Promise<RiskPolicy> {
  const stored = await getStore().getPolicy();
  return stored ?? DEFAULT_POLICY;
}

/**
 * Assembles the evaluation context from stored history.
 *
 * @param now - The moment to evaluate against. Injected so callers and tests
 *   control it rather than the engine reading a clock.
 * @returns The context.
 */
export async function buildContext(now: Date): Promise<EvaluationContext> {
  const store = getStore();
  const sinceIso = new Date(now.getTime() - DAY_MS).toISOString();

  const [recentActions, openExposureAtomic] = await Promise.all([
    store.readExecutions(sinceIso),
    store.getOpenExposureAtomic(),
  ]);

  return { now, recentActions, openExposureAtomic };
}

/**
 * Resolves an opportunity and an amount into a canonical action and a verdict.
 *
 * @param opportunityId - Which opportunity.
 * @param amount - Decimal token amount, or null when atomic is given.
 * @param amountAtomic - Atomic amount, or null when decimal is given.
 * @param now - Evaluation moment.
 * @returns The decision, or a failure.
 */
export async function decide(
  opportunityId: string,
  amount: string | undefined,
  amountAtomic: string | undefined,
  now: Date,
): Promise<DecisionResult | FlowFailure> {
  // 1. Our record. Not the caller's claim about it.
  const opportunity = getOpportunity(opportunityId);
  if (!opportunity) {
    return { ok: false, reason: `Unknown opportunity "${opportunityId}".`, status: 404 };
  }

  // Amount is the one thing the caller genuinely chooses.
  let atomic: bigint;
  try {
    atomic =
      amountAtomic !== undefined
        ? BigInt(amountAtomic)
        : parseDecimalToAtomic(amount!, opportunity.tokenDecimals);
  } catch (error) {
    return { ok: false, reason: String(error instanceof Error ? error.message : error), status: 400 };
  }

  // 2. The chain. Not a cached figure and not a caller-supplied one.
  let balance: bigint;
  try {
    balance = await getTokenBalanceAtomic(opportunity.tokenAddress);
  } catch (error) {
    return {
      ok: false,
      reason: `Could not read the on-chain balance: ${String(error)}`,
      status: 502,
    };
  }

  // 3. Canonical action, from (1) and (2) only.
  const action = buildCanonicalAction(opportunity, atomic, balance);

  // 4. Judgement.
  const policy = await activePolicy();
  const context = await buildContext(now);
  const verdict = evaluate(action, policy, context);

  await append("POLICY_EVALUATED", opportunity.id, {
    amountAtomic: atomic,
    walletBalanceAtomic: balance,
    openExposureAtomic: context.openExposureAtomic,
    recentActionCount: context.recentActions.length,
  }, verdict);

  return {
    opportunity,
    action,
    policy,
    verdict,
    context: {
      now: now.toISOString(),
      recentActionCount: context.recentActions.length,
      openExposureAtomic: context.openExposureAtomic,
    },
  };
}

/** True when a decide() result is a failure. */
export function isFailure(
  result: DecisionResult | FlowFailure,
): result is FlowFailure {
  return (result as FlowFailure).ok === false;
}
