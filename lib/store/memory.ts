/**
 * In-memory store.
 *
 * The default when Supabase is not configured. Everything lives in process
 * memory and is lost on restart — which is correct for development and for
 * tests, and clearly wrong for production. `/api/health` reports which store
 * is active so nobody has to guess.
 */

import type { AuditEvent } from "../audit/types";
import type { ExecutedAction, RiskPolicy } from "../policy/types";
import type { Store } from "./types";

/**
 * Creates a fresh in-memory store.
 *
 * @returns A Store backed by ordinary arrays.
 */
export function createMemoryStore(): Store {
  let policy: RiskPolicy | null = null;
  let openExposure = 0n;
  const audit: AuditEvent[] = [];
  const executions: ExecutedAction[] = [];

  return {
    kind: "memory",

    async getPolicy() {
      return policy ? { ...policy } : null;
    },

    async setPolicy(next) {
      policy = { ...next };
    },

    async appendAudit(event) {
      audit.push(event);
    },

    async readAudit(limit) {
      const all = audit.map((e) => ({ ...e }));
      return limit === undefined ? all : all.slice(-limit);
    },

    async recordExecution(executed) {
      executions.push({ ...executed });
    },

    async readExecutions(sinceIso) {
      const since = Date.parse(sinceIso);
      return executions
        .filter((e) => {
          const t = Date.parse(e.at);
          // An unreadable timestamp is kept, not dropped. The policy engine
          // rejects on it; silently discarding it here would hide spending
          // from the very limit meant to catch it.
          return Number.isNaN(t) || t > since;
        })
        .map((e) => ({ ...e }));
    },

    async getOpenExposureAtomic() {
      return openExposure;
    },

    async setOpenExposureAtomic(value) {
      openExposure = value;
    },
  };
}
