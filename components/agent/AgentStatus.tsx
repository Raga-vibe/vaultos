"use client";

/**
 * Agent status.
 *
 * Presentation states derived from what the API already reports. No new
 * backend state is invented here: "Ready" means the wallet resolved on the
 * expected chain, "Blocked" means it did not. The agent's authority level is
 * read from the policy's autoExecute flag, because that is the single setting
 * deciding whether it may act alone.
 */

import { Card, Pill, Skeleton, StatusDot } from "../ui/primitives";
import { BASE_SEPOLIA_CHAIN_ID } from "../../lib/policy/types";
import type { Async, Policy, WalletInfo } from "../../lib/ui/api";

/**
 * Whether a human still has to confirm each action.
 *
 * @param policy - The active policy, or null while loading.
 * @returns True when autoExecute is off.
 */
function isSupervised(policy: Policy | null): boolean {
  return policy ? !policy.autoExecute : true;
}

/**
 * Readiness is derived from the WALLET response, not from /api/health.
 *
 * Both endpoints resolve the same CDP wallet, so asking for health here made
 * Overview pay for that resolution twice on every load, in parallel, for one
 * boolean that the wallet response already answers. Same fact, same source of
 * truth, one request.
 */
export function AgentStatus({
  wallet,
  policy,
}: {
  wallet: Async<WalletInfo>;
  policy: Policy | null;
}) {
  if (wallet.loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-32" />
      </Card>
    );
  }

  const ready =
    Boolean(wallet.data?.wallet?.address) &&
    wallet.data?.wallet?.chainId === String(BASE_SEPOLIA_CHAIN_ID);
  const supervised = isSupervised(policy);

  return (
    <Card className="p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
        Agent
      </p>

      <div className="mt-3">
        <StatusDot
          tone={ready ? "approve" : "reject"}
          label={ready ? "Ready" : "Blocked"}
        />
      </div>

      <div className="mt-3 border-t border-ink-800 pt-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-mute-2">
          Acting on its own
        </p>
        <div className="mt-1.5">
          {policy === null ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Pill tone={supervised ? "approve" : "warn"}>
              {supervised ? "Asks you first" : "Acts alone"}
            </Pill>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mute-2">
          {policy === null
            ? null
            : supervised
              ? "Off — every approved move waits for you."
              : "On — approved moves run without asking."}
        </p>
      </div>
    </Card>
  );
}
