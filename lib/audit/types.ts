/**
 * Audit event shapes.
 *
 * Split out from log.ts so the store layer can depend on the types without
 * pulling in the logging implementation.
 */

import type { PolicyVerdict } from "../policy/types";

/** Kinds of event the system records. */
export type AuditEventType =
  | "OPPORTUNITY_SOURCED"
  | "ASSESSMENT_REQUESTED"
  | "ASSESSMENT_RECEIVED"
  | "ASSESSMENT_REJECTED"
  | "POLICY_UPDATED"
  | "POLICY_EVALUATED"
  | "EXECUTION_SUBMITTED"
  | "EXECUTION_CONFIRMED"
  | "EXECUTION_FAILED";

/** One recorded event. */
export type AuditEvent = {
  /** Monotonic sequence number within this process. */
  seq: number;
  /** ISO 8601 timestamp. */
  at: string;
  type: AuditEventType;
  /** Opportunity this event concerns, when applicable. */
  opportunityId: string | null;
  /** Free-form detail. Must never contain a credential. */
  detail: Record<string, unknown>;
  /** The policy verdict, when this event followed an evaluation. */
  verdict: PolicyVerdict | null;
};
