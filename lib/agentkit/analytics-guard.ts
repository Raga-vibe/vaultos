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
 * Matches narrowly — the message shape AND the originating function name must
 * both line up. A generic "HTTP error!" from anywhere else is not swallowed.
 *
 * @param reason - The rejection value.
 * @returns True only for the analytics failure.
 */
function isAgentKitAnalyticsFailure(reason: unknown): boolean {
  if (!(reason instanceof Error)) return false;

  const messageMatches = /^HTTP error! status: \d+$/.test(reason.message);
  const stack = reason.stack ?? "";
  const fromAnalytics =
    stack.includes("sendAnalyticsEvent") ||
    stack.includes("analytics") ||
    stack.includes("cca-lite.coinbase.com");

  return messageMatches && fromAnalytics;
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

    // Anything else must still be fatal. Re-raising as an uncaught exception
    // reproduces Node's default behaviour: print the stack and exit non-zero.
    throw reason;
  });
}
