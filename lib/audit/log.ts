/**
 * Append-only audit log.
 *
 * append() and read(), with no update and no delete. An audit log you can edit
 * is not an audit log.
 *
 * Every event that matters to the thesis — what SERV said, what the policy
 * engine decided, what was executed — lands here with the verdict attached, so
 * a reviewer can reconstruct why any given transaction was or was not allowed.
 *
 * Writes go to whichever store is active. A failed write is reported but never
 * throws into the caller: losing a log line is bad, but aborting a transaction
 * that already succeeded on chain because its log entry failed is worse.
 */

import { getStore } from "../store";
import type { PolicyVerdict } from "../policy/types";
import type { AuditEvent, AuditEventType } from "./types";

export type { AuditEvent, AuditEventType } from "./types";

let seq = 0;

/**
 * Serialises a value for the log, rendering bigints as strings.
 *
 * JSON.stringify throws on a bigint, and atomic amounts are bigints
 * throughout. Losing the log because an amount was recorded correctly would be
 * an unfortunate trade.
 *
 * @param value - Any value.
 * @returns A JSON-safe equivalent.
 */
export function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        jsonSafe(v),
      ]),
    );
  }
  return value;
}

/**
 * Appends an event. There is no corresponding update or delete.
 *
 * @param type - The event type.
 * @param opportunityId - Related opportunity, or null.
 * @param detail - Free-form detail. No credentials.
 * @param verdict - The policy verdict, when applicable.
 * @returns The recorded event.
 */
export async function append(
  type: AuditEventType,
  opportunityId: string | null,
  detail: Record<string, unknown> = {},
  verdict: PolicyVerdict | null = null,
): Promise<AuditEvent> {
  const event: AuditEvent = {
    seq: ++seq,
    at: new Date().toISOString(),
    type,
    opportunityId,
    detail: jsonSafe(detail) as Record<string, unknown>,
    verdict: jsonSafe(verdict) as PolicyVerdict | null,
  };

  if (process.env.AUDIT_STDOUT?.trim().toLowerCase() === "on") {
    console.log(`[audit] ${JSON.stringify(event)}`);
  }

  try {
    await getStore().appendAudit(event);
  } catch (error) {
    console.error(
      `[audit] FAILED TO PERSIST event ${event.seq} (${type}): ${String(error)}`,
    );
  }

  return event;
}

/**
 * Reads the log.
 *
 * @param limit - Maximum events to return.
 * @returns Events, newest last.
 */
export async function read(limit?: number): Promise<AuditEvent[]> {
  return getStore().readAudit(limit);
}
