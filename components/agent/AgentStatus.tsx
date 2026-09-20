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
import type { Async, Health, Policy } from "../../lib/ui/api";

/**
 * Whether a human still has to confirm each action.
 *
 * @param policy - The active policy, or null while loading.
 * @returns True when autoExecute is off.
 */
function isSupervised(policy: Policy | null): boolean {
  return policy ? !policy.autoExecute : true;
}

export function AgentStatus({
  health,
  policy,
}: {
  health: Async<Health>;
  policy: Policy | null;
}) {
  if (health.loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-32" />
      </Card>
    );
  }

  const ready =
    Boolean(health.data?.wallet?.address) && health.data?.onExpectedChain === true;
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
          Authority
        </p>
        <div className="mt-1.5">
          {policy === null ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Pill tone={supervised ? "approve" : "warn"}>
              {supervised ? "Supervised" : "Autonomous"}
            </Pill>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mute-2">
          {policy === null
            ? null
            : supervised
              ? "autoExecute is off — every approved action waits for a person."
              : "autoExecute is on — approved actions run without confirmation."}
        </p>
      </div>
    </Card>
  );
}
