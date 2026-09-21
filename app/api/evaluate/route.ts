/**
 * Judge a proposed action without doing anything.
 *
 * A dry run: builds the canonical action from our records and the real chain
 * balance, runs the policy engine, returns the verdict. Nothing is executed
 * and nothing is recorded as an execution.
 */
import { decide, isFailure } from "../../../lib/api/flow";
import { ActionBodySchema, parseBody } from "../../../lib/api/validate";
import { fail, ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A chain read behind this can be slow on the public Base Sepolia endpoint —
 * measured at six to seven seconds — so the ceiling is raised above the
 * platform default. This changes only how long we are willing to WAIT. A
 * timeout still produces a system error, never a verdict.
 */
export const maxDuration = 30;

/** How stale a previewed balance may be. Execution never uses this. */
const PREVIEW_BALANCE_MAX_AGE_MS = 15_000;

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

    const result = await decide(
      body.opportunityId,
      body.amount,
      body.amountAtomic,
      new Date(),
      // A verdict printed on a card is a preview, not an authorization, so a
      // balance a few seconds old is acceptable here and saves the grid six
      // separate one-to-six-second RPC reads on load. /api/execute passes
      // nothing and always re-reads.
      PREVIEW_BALANCE_MAX_AGE_MS,
    );
    if (isFailure(result)) return fail(result.reason, result.status);

    return ok({
      decision: result.verdict.decision,
      verdict: result.verdict,
      action: result.action,
      policy: result.policy,
      context: result.context,
      executed: false,
    });
  } catch (error) {
    return serverError(error, "Could not evaluate the action");
  }
}
