/**
 * One execution at a time, per intent.
 *
 * THE BUG THIS PREVENTS
 *
 * Two POSTs to /api/execute arriving close together both submit a transfer.
 * The cooldown rule does not stop it, and that is not a bug in the rule: the
 * engine judges against the recorded history, and the record of an execution
 * is only written AFTER the transaction has been submitted — which takes
 * seconds on a public network. A second request arriving inside that window
 * reads a history in which the first execution has not happened yet, is
 * correctly approved on that evidence, and sends a second real transfer.
 *
 * A double-click does exactly this. So does a retry, an impatient refresh, or
 * a proxy replaying a request. The money moves twice and both transactions are
 * legitimate as far as every layer below this one is concerned.
 *
 * WHY THE GUARD LIVES HERE AND NOT IN THE ENGINE
 *
 * The policy engine is pure and must stay that way — it cannot know what is
 * in flight, because knowing would mean reading shared mutable state, and the
 * moment it does that it stops being reproducible. This is a transport-level
 * concern: the same intent submitted twice in quick succession is one intent.
 * So it is enforced at the route boundary, where duplicate requests exist.
 *
 * WHAT THIS IS NOT
 *
 * Not a distributed lock. A serverless deployment can run several instances,
 * and two requests landing on two cold instances will not see each other. It
 * removes the overwhelmingly common case — repeated clicks from one browser,
 * which land on the same warm instance — and it is honest about the rest.
 * Real cross-instance safety needs an idempotency key accepted by the wallet
 * provider, which the current AgentKit surface does not expose.
 */

import { assertServer } from "../server-guard";

assertServer("lib/api/single-flight.ts");

/**
 * How long an entry may sit before it is assumed dead.
 *
 * A process killed mid-execution never runs its own cleanup, so without an
 * expiry one crash would block that intent until the instance recycled. Set
 * above the route's own maxDuration so it can never expire a live request.
 */
const STALE_AFTER_MS = 90_000;

const KEY = Symbol.for("agentvault.inflight");

/**
 * The process-wide set of intents currently executing.
 *
 * @returns The map, created on first use.
 */
function inFlight(): Map<string, number> {
  const g = globalThis as unknown as Record<symbol, Map<string, number> | undefined>;
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

/** Raised when the same intent is already executing. */
export class AlreadyInFlightError extends Error {
  constructor(key: string) {
    super(
      `An execution for "${key}" is already in progress. Nothing was sent ` +
        `twice. Wait for the first one to finish before trying again.`,
    );
    this.name = "AlreadyInFlightError";
  }
}

/**
 * Runs `work` unless the same key is already running.
 *
 * @param key - Identifies the intent: opportunity plus amount.
 * @param work - The execution to perform.
 * @returns Whatever `work` returns.
 * @throws AlreadyInFlightError when a duplicate is rejected.
 */
export async function runExclusive<T>(
  key: string,
  work: () => Promise<T>,
): Promise<T> {
  const map = inFlight();
  const startedAt = map.get(key);

  if (startedAt !== undefined && Date.now() - startedAt < STALE_AFTER_MS) {
    throw new AlreadyInFlightError(key);
  }

  map.set(key, Date.now());
  try {
    return await work();
  } finally {
    // Released whether the work succeeded, was refused, or threw. A guard that
    // only releases on success turns one failure into a permanent block.
    map.delete(key);
  }
}
