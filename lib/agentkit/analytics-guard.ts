/**
 * Guard against AgentKit's analytics crashing the process.
 *
 * THE BUG
 *
 * Every WalletProvider fires a telemetry ping on construction. In
 * dist/wallet-providers/walletProvider.js:
 *
 *     trackInitialization() {
 *         try {
 *             sendAnalyticsEvent({ ... });      // async — returns a Promise
 *         } catch (error) {
 *             console.warn("Failed to track ...", error);
 *         }
 *     }
 *
 * and in dist/analytics/sendAnalyticsEvent.js:
 *
 *     if (!response.ok) {
 *         throw new Error(`HTTP error! status: ${response.status}`);
 *     }
 *
 * The try/catch is useless here: `sendAnalyticsEvent` is async, so it returns
 * a promise rather than throwing synchronously. Nothing awaits it and nothing
 * attaches a .catch(), so the rejection is unhandled — and since Node 15 an
 * unhandled rejection terminates the process.
 *
 * The result: if `cca-lite.coinbase.com` is unreachable, rate-limited, or
 * returns anything non-2xx (a 400 has been observed), the whole application
 * dies while constructing a wallet. A failed telemetry ping should never be
 * able to do that.
 *
 * THE FIX
 *
 * Install one process-level handler that swallows EXACTLY this rejection and
 * nothing else. Every other unhandled rejection is re-raised so it still
 * crashes loudly — silencing real failures would be a far worse bug than the
 * one being worked around.
 *
 * Deliberately not patching node_modules: that would be undone by the next
 * npm install, and a fix that quietly disappears is not a fix.
 */

let installed = false;

/**
 * Decides whether a rejection is AgentKit's analytics ping failing.
 *
 * MATCHES ON THE MESSAGE, NOT THE STACK.
 *
 * An earlier version also required the stack to name `sendAnalyticsEvent`,
 * on the reasoning that a narrower match is a safer one. That was wrong, and
 * it took down a deployment.
 *
 * Stack traces are not dependable. Next collapses frames in development —
 * the dev server prints this exact rejection as
 *
 *     Error: HTTP error! status: 400
 *         at ignore-listed frames
 *
 * and serverless bundlers, minifiers and async boundaries all drop or rename
 * frames too. When the stack did not mention analytics, the guard re-threw,
 * the unhandled rejection killed the function mid-request, and every API route
 * answered with the platform's own non-JSON 500 instead of a readable error.
 *
 * `HTTP error! status: NNN` is thrown in exactly one place in this
 * application's entire dependency graph: AgentKit's sendAnalyticsEvent. No
 * code here produces that string, and every module of ours that throws
 * prefixes its message with what failed. So the message alone identifies it
 * precisely, and unlike a stack it cannot be erased by a build step.
 *
 * @param reason - The rejection value.
 * @returns True only for the analytics failure.
 */
function isAgentKitAnalyticsFailure(reason: unknown): boolean {
  if (!(reason instanceof Error)) return false;
  return /^HTTP error! status: \d+$/.test(reason.message);
}

/**
 * Installs the guard. Safe to call repeatedly; only the first call binds.
 *
 * Call this before any wallet provider is constructed.
 */
export function installAnalyticsCrashGuard(): void {
  if (installed) return;
  if (typeof process === "undefined" || typeof process.on !== "function") return;
  installed = true;

  process.on("unhandledRejection", (reason: unknown) => {
    if (isAgentKitAnalyticsFailure(reason)) {
      const message =
        reason instanceof Error ? reason.message : String(reason);
      console.warn(
        `[vaultos] Ignored a failed AgentKit telemetry ping (${message}). ` +
          `This is cosmetic — it does not affect your wallet or any ` +
          `transaction. See lib/agentkit/analytics-guard.ts.`,
      );
      return;
    }

    // Anything else stays fatal, but it is logged first. A process that dies
    // silently in a serverless function leaves only a blank 500 in the
    // client — the reason needs to reach the platform log before the throw
    // takes the process down.
    console.error(
      "[vaultos] Fatal unhandled rejection (not AgentKit telemetry):",
      reason,
    );
    throw reason;
  });
}
