/**
 * Evaluate, then execute if — and only if — the policy approved it.
 *
 * This is the one route that moves money, so the order below is the whole
 * security model in sequence. Nothing about it may be reordered for
 * convenience.
 *
 * TWO DECISIONS WORTH KNOWING ABOUT
 *
 * 1. requiresManualApproval does NOT execute.
 *    An APPROVED verdict with autoExecute off means "policy permits this, a
 *    human must still say go". This route returns that state and stops. It
 *    does not treat its own call as the human saying go — the caller could be
 *    an agent loop, and "the thing asking to spend the money" is not a
 *    substitute for consent.
 *
 * 2. An execution is recorded the moment a transaction hash exists, not when
 *    the receipt confirms.
 *    Once a transfer is broadcast the funds are committed whether or not we
 *    manage to read the receipt afterwards. If the count only advanced on
 *    confirmation, a failed receipt read would leave the spend invisible to
 *    the daily cap and the agent could send it again. Counting on submission
 *    can at worst over-count a transaction that never lands, which costs an
 *    unused allowance. Counting on confirmation can at worst double-spend.
 *    The asymmetry decides it.
 */

import { append } from "../../../lib/audit/log";
import { decide, isFailure } from "../../../lib/api/flow";
import { ActionBodySchema, parseBody } from "../../../lib/api/validate";
import { fail, ok, serverError } from "../../../lib/api/respond";
import {
  confirmTransaction,
  submitTokenTransfer,
} from "../../../lib/agentkit/execute";
import { getStore } from "../../../lib/store";
import {
  AlreadyInFlightError,
  runExclusive,
} from "../../../lib/api/single-flight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seconds this route may run before the host terminates it.
 *
 * This route submits a transaction and then waits for a block to confirm
 * it. Block time is not ours to control, so the budget has to cover it.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = parseBody(ActionBodySchema, raw);
    if (!parsed.ok) return fail(`Invalid request — ${parsed.reason}`);

    const body = parsed.value as {
      opportunityId: string;
      amount?: string;
      amountAtomic?: string;
    };

    /*
      One execution at a time per intent.

      Everything below — judging, submitting, recording, confirming — takes
      seconds, and the execution is only recorded once the transaction has
      been submitted. A second identical request arriving inside that window
      reads a history where the first has not happened and is approved on that
      evidence, sending the money twice. A double-click is enough.

      The key is the intent, not the request: same opportunity, same amount.
      A genuinely different amount is a different intent and proceeds.
    */
    const intent = `${body.opportunityId}:${body.amountAtomic ?? body.amount ?? ""}`;

    return await runExclusive(intent, async () => {
      // ─── 1. Judge ───────────────────────────────────────────────────────
      const result = await decide(
        body.opportunityId,
        body.amount,
        body.amountAtomic,
        new Date(),
      );
      if (isFailure(result)) return fail(result.reason, result.status);

      const { opportunity, action, verdict, policy } = result;

      // ─── 2. Refuse anything not approved ────────────────────────────────
      if (verdict.decision !== "APPROVED") {
        return ok(
          {
            decision: "REJECTED",
            verdict,
            action,
            policy,
            executed: false,
            reason:
              "The policy engine rejected this action. Nothing was executed.",
          },
          200,
        );
      }

      // ─── 3. Approved, but a human still has to say go ───────────────────
      if (verdict.requiresManualApproval) {
        return ok({
          decision: "APPROVED",
          verdict,
          action,
          policy,
          executed: false,
          requiresManualApproval: true,
          reason:
            "Policy permits this action, but autoExecute is off. A human must " +
            "confirm before it runs.",
        });
      }

      // ─── 4. Destination must be configured, not guessed ─────────────────
      if (!opportunity.depositAddress) {
        await append("EXECUTION_FAILED", opportunity.id, {
          reason: "OPPORTUNITY_DEPOSIT_ADDRESS is not set",
        });
        return fail(
          "No deposit address is configured for this opportunity. Set " +
            "OPPORTUNITY_DEPOSIT_ADDRESS. Refusing to guess a destination.",
          500,
        );
      }

      // ─── 5. Submit ──────────────────────────────────────────────────────
      const submitted = await submitTokenTransfer(
        opportunity.depositAddress,
        action.amountAtomic,
        opportunity.tokenAddress,
      );

      if (!submitted.ok) {
        await append(
          "EXECUTION_FAILED",
          opportunity.id,
          {
            reason: submitted.reason,
            raw: submitted.raw,
          },
          verdict,
        );
        return fail(`Execution failed: ${submitted.reason}`, 502);
      }

      await append(
        "EXECUTION_SUBMITTED",
        opportunity.id,
        {
          hash: submitted.hash,
          amountAtomic: action.amountAtomic,
          to: opportunity.depositAddress,
        },
        verdict,
      );

      // ─── 6. Count it NOW — see note 2 at the top of this file ───────────
      const store = getStore();
      await store.recordExecution({
        at: new Date().toISOString(),
        amountAtomic: action.amountAtomic,
        opportunityId: opportunity.id,
      });
      await store.setOpenExposureAtomic(
        (await store.getOpenExposureAtomic()) + action.amountAtomic,
      );

      // ─── 7. Confirm ─────────────────────────────────────────────────────
      const confirmed = await confirmTransaction(submitted.hash);

      if (!confirmed.ok) {
        await append(
          "EXECUTION_FAILED",
          opportunity.id,
          {
            hash: submitted.hash,
            reason: confirmed.reason,
          },
          verdict,
        );
        return fail(
          `Transaction ${submitted.hash} was submitted but not confirmed: ` +
            `${confirmed.reason}`,
          502,
          { hash: submitted.hash, submitted: true, confirmed: false },
        );
      }

      await append(
        "EXECUTION_CONFIRMED",
        opportunity.id,
        {
          hash: submitted.hash,
          block: confirmed.blockNumber,
          gasUsed: confirmed.gasUsed,
        },
        verdict,
      );

      return ok({
        decision: "APPROVED",
        verdict,
        action,
        policy,
        executed: true,
        transaction: {
          hash: submitted.hash,
          block: confirmed.blockNumber,
          gasUsed: confirmed.gasUsed,
          explorer: `https://sepolia.basescan.org/tx/${submitted.hash}`,
        },
      });
    });
  } catch (error) {
    // A rejected duplicate is not a fault. 409 Conflict says "this request
    // collided with one already running", which is exactly what happened.
    if (error instanceof AlreadyInFlightError) {
      return fail(error.message, 409);
    }
    return serverError(error, "Could not execute the action");
  }
}
