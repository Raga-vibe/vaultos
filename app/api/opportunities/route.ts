/** The opportunities the agent may be asked to assess. */
import { listOpportunities } from "../../../lib/opportunities/source";
import { ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ opportunities: listOpportunities() });
  } catch (error) {
    return serverError(error, "Could not list opportunities");
  }
}
