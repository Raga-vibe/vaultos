/**
 * Reducing the audit trail to the few facts worth showing a stranger.
 *
 * Kept here rather than in the component because it is pure data reduction
 * and because the property it guarantees deserves tests: the public page may
 * only claim a transaction that the trail actually records.
 */

import type { AuditEvent } from "./api";

export type Proof = {
  hash: string;
  block: string | null;
  refusals: number;
  decisions: number;
  assessments: number;
};

/**
 * Summarises a trail for the public proof strip.
 *
 * Returns null when there is no CONFIRMED execution to point at. Submitted is
 * not confirmed, and a confirmation without a hash is not verifiable, so
 * neither counts — the reader is being invited to go and check, and a link
 * they cannot check is worse than no link.
 *
 * @param events - The audit trail, oldest first.
 * @returns The facts, or null when there is nothing proven to report.
 */
export function summariseProof(events: AuditEvent[]): Proof | null {
  let latest: AuditEvent | null = null;
  let refusals = 0;
  let decisions = 0;
  let assessments = 0;

  for (const e of events) {
    if (e.type === "POLICY_EVALUATED") {
      decisions += 1;
      if (e.verdict?.decision === "REJECTED") refusals += 1;
    }
    if (e.type === "ASSESSMENT_RECEIVED") assessments += 1;
    if (e.type === "EXECUTION_CONFIRMED") latest = e;
  }

  const hash = typeof latest?.detail.hash === "string" ? latest.detail.hash : null;
  if (!hash) return null;

  const block =
    typeof latest?.detail.block === "string" ? latest.detail.block : null;

  return { hash, block, refusals, decisions, assessments };
}
