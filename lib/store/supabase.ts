/**
 * Supabase store.
 *
 * Talks to PostgREST directly with fetch rather than pulling in
 * @supabase/supabase-js. The client library would add a sizeable dependency
 * tree for what amounts to six HTTP calls, and this project already carries a
 * large one through AgentKit.
 *
 * Uses the service role key, so this module must never reach the browser.
 * server-guard enforces that at import time.
 *
 * BIGINTS
 *
 * Atomic amounts are bigints and can exceed what a JSON number holds safely.
 * They are stored as TEXT and converted at this boundary — never as numeric
 * columns, and never through JSON.parse's number handling. A rounded amount
 * is a wrong amount.
 */

import { assertServer, requireEnv } from "../server-guard";
import type { AuditEvent } from "../audit/types";
import type { ExecutedAction, RiskPolicy } from "../policy/types";
import type { Store } from "./types";

assertServer("lib/store/supabase.ts");

/** The single row holding the active policy. */
const POLICY_ROW_ID = "default";

/**
 * Serialises a policy for storage, rendering bigints as strings.
 *
 * @param policy - The policy.
 * @returns A JSON-safe object.
 */
function encodePolicy(policy: RiskPolicy): Record<string, unknown> {
  return {
    ...policy,
    minReserveAtomic:
      policy.minReserveAtomic === undefined
        ? undefined
        : policy.minReserveAtomic.toString(),
  };
}

/**
 * Restores a policy from storage, converting string amounts back to bigint.
 *
 * @param raw - The stored object.
 * @returns The policy.
 */
function decodePolicy(raw: Record<string, unknown>): RiskPolicy {
  const out = { ...raw } as Record<string, unknown>;
  if (out.minReserveAtomic !== undefined && out.minReserveAtomic !== null) {
    out.minReserveAtomic = BigInt(String(out.minReserveAtomic));
  } else {
    delete out.minReserveAtomic;
  }
  return out as unknown as RiskPolicy;
}

/**
 * Creates a Supabase-backed store.
 *
 * @returns A Store talking to PostgREST.
 */
export function createSupabaseStore(): Store {
  const url = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  /**
   * Performs a PostgREST request.
   *
   * @param path - Path after /rest/v1/.
   * @param init - Fetch options.
   * @returns The parsed JSON body.
   */
  async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Supabase ${init.method ?? "GET"} ${path} failed: ` +
          `${response.status} ${response.statusText}. ${body.slice(0, 400)}`,
      );
    }

    const text = await response.text();
    return text === "" ? null : JSON.parse(text);
  }

  return {
    kind: "supabase",

    async getPolicy() {
      const rows = (await rest(
        `policies?id=eq.${POLICY_ROW_ID}&select=data`,
      )) as Array<{ data: Record<string, unknown> }> | null;
      if (!rows || rows.length === 0) return null;
      return decodePolicy(rows[0].data);
    },

    async setPolicy(policy) {
      await rest("policies", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify([
          { id: POLICY_ROW_ID, data: encodePolicy(policy) },
        ]),
      });
    },

    async appendAudit(event) {
      await rest("audit_events", {
        method: "POST",
        body: JSON.stringify([
          {
            seq: event.seq,
            at: event.at,
            type: event.type,
            opportunity_id: event.opportunityId,
            detail: event.detail,
            verdict: event.verdict,
          },
        ]),
      });
    },

    async readAudit(limit) {
      const rows = (await rest(
        `audit_events?select=*&order=at.asc${limit ? `&limit=${limit}` : ""}`,
      )) as Array<Record<string, unknown>> | null;
      return (rows ?? []).map((r) => ({
        seq: Number(r.seq),
        at: String(r.at),
        type: r.type as AuditEvent["type"],
        opportunityId: (r.opportunity_id as string | null) ?? null,
        detail: (r.detail as Record<string, unknown>) ?? {},
        verdict: (r.verdict as AuditEvent["verdict"]) ?? null,
      }));
    },

    async recordExecution(executed) {
      await rest("executions", {
        method: "POST",
        body: JSON.stringify([
          {
            at: executed.at,
            amount_atomic: executed.amountAtomic.toString(),
            opportunity_id: executed.opportunityId,
          },
        ]),
      });
    },

    async readExecutions(sinceIso) {
      const rows = (await rest(
        `executions?select=*&at=gt.${encodeURIComponent(sinceIso)}`,
      )) as Array<Record<string, unknown>> | null;
      return (rows ?? []).map((r) => ({
        at: String(r.at),
        amountAtomic: BigInt(String(r.amount_atomic)),
        opportunityId: String(r.opportunity_id),
      }));
    },

    async getOpenExposureAtomic() {
      const rows = (await rest(
        `positions?id=eq.${POLICY_ROW_ID}&select=open_exposure_atomic`,
      )) as Array<{ open_exposure_atomic: string }> | null;
      if (!rows || rows.length === 0) return 0n;
      return BigInt(String(rows[0].open_exposure_atomic ?? "0"));
    },

    async setOpenExposureAtomic(value) {
      await rest("positions", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify([
          { id: POLICY_ROW_ID, open_exposure_atomic: value.toString() },
        ]),
      });
    },
  };
}
