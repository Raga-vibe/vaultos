/**
 * Persistence contract.
 *
 * One interface, two implementations: an in-memory store for development and
 * tests, and Supabase for anything real. The rest of the codebase depends on
 * this interface and never on either implementation, so swapping the backing
 * database cannot change behaviour anywhere else.
 *
 * Every method is async even where the memory implementation could answer
 * synchronously. Pretending storage is instant here would mean rewriting every
 * caller the day it stops being.
 */

import type { AuditEvent } from "../audit/types";
import type { ExecutedAction, RiskPolicy } from "../policy/types";

/** What a store must be able to do. */
export type Store = {
  /** Which backend this is — reported by /api/health, never used to branch. */
  readonly kind: "memory" | "supabase";

  /** Reads the stored policy, or null when none has been set. */
  getPolicy(): Promise<RiskPolicy | null>;

  /** Replaces the stored policy. */
  setPolicy(policy: RiskPolicy): Promise<void>;

  /** Appends an audit event. There is no update and no delete. */
  appendAudit(event: AuditEvent): Promise<void>;

  /**
   * Reads audit events, newest last.
   *
   * @param limit - Maximum events to return.
   */
  readAudit(limit?: number): Promise<AuditEvent[]>;

  /**
   * Records an executed action, for the engine's rate and exposure limits.
   *
   * Separate from the audit log on purpose: the audit log is a narrative of
   * everything that happened, while this is the small, precise set of facts
   * the policy engine does arithmetic on. Deriving one from the other by
   * filtering event types would make a safety limit depend on log formatting.
   */
  recordExecution(executed: ExecutedAction): Promise<void>;

  /**
   * Reads executed actions inside a time window.
   *
   * @param sinceIso - ISO timestamp; actions at or before this are excluded.
   */
  readExecutions(sinceIso: string): Promise<ExecutedAction[]>;

  /** Total atomic units currently deployed across open positions. */
  getOpenExposureAtomic(): Promise<bigint>;

  /** Sets the open exposure figure. */
  setOpenExposureAtomic(value: bigint): Promise<void>;
};
