/**
 * Read and replace the standing policy.
 *
 * PUT validates strictly and rejects unknown fields, so a typo'd constraint
 * name fails loudly instead of being silently dropped — a dropped constraint
 * is an unenforced constraint.
 */
import { append } from "../../../lib/audit/log";
import { DEFAULT_POLICY } from "../../../lib/policy/defaults";
import { getStore } from "../../../lib/store";
import { PolicyBodySchema, parseBody, toRiskPolicy } from "../../../lib/api/validate";
import { fail, ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stored = await getStore().getPolicy();
    return ok({ policy: stored ?? DEFAULT_POLICY, isDefault: stored === null });
  } catch (error) {
    return serverError(error, "Could not read the policy");
  }
}

export async function PUT(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = parseBody(PolicyBodySchema, raw);
    if (!parsed.ok) return fail(`Invalid policy — ${parsed.reason}`);

    const policy = toRiskPolicy(parsed.value as never);
    await getStore().setPolicy(policy);
    await append("POLICY_UPDATED", null, { policy });

    return ok({ policy });
  } catch (error) {
    return serverError(error, "Could not save the policy");
  }
}
