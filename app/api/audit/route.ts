/** The append-only audit trail. */
import { read } from "../../../lib/audit/log";
import { ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam === null ? undefined : Number(limitParam);
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      return new Response(
        JSON.stringify({ ok: false, error: "limit must be a positive integer" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    return ok({ events: await read(limit) });
  } catch (error) {
    return serverError(error, "Could not read the audit log");
  }
}
