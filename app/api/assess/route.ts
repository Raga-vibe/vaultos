/**
 * Ask SERV to assess an opportunity.
 *
 * ADVISORY ONLY. The response of this route cannot cause anything to happen.
 * Nothing here writes a policy, records an execution, or touches the chain.
 * It exists so a user can read what the model thinks before deciding.
 */
import { append } from "../../../lib/audit/log";
import { assessOpportunity } from "../../../lib/serv/assess";
import { getOpportunity } from "../../../lib/opportunities/source";
import { getTokenBalanceAtomic } from "../../../lib/agentkit/execute";
import { AssessBodySchema, parseBody } from "../../../lib/api/validate";
import { fail, ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = parseBody(AssessBodySchema, raw);
    if (!parsed.ok) return fail(`Invalid request — ${parsed.reason}`);

    const { opportunityId } = parsed.value as { opportunityId: string };
    const opportunity = getOpportunity(opportunityId);
    if (!opportunity) return fail(`Unknown opportunity "${opportunityId}".`, 404);

    const balance = await getTokenBalanceAtomic(opportunity.tokenAddress);
    await append("ASSESSMENT_REQUESTED", opportunity.id, { walletBalanceAtomic: balance });

    const result = await assessOpportunity(opportunity, balance);

    if (!result.ok) {
      await append("ASSESSMENT_REJECTED", opportunity.id, { reason: result.reason });
      return fail(`SERV assessment rejected: ${result.reason}`, 502);
    }

    await append("ASSESSMENT_RECEIVED", opportunity.id, { assessment: result.assessment });

    return ok({
      opportunity,
      assessment: result.assessment,
      advisory: true,
      note:
        "This assessment is advisory. It is not an input to the policy engine " +
        "and cannot authorise anything.",
    });
  } catch (error) {
    return serverError(error, "Could not complete the assessment");
  }
}
