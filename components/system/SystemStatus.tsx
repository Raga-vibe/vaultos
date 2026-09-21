"use client";

/**
 * System status.
 *
 * Shows only what GET /api/health actually returns. Where the API is silent,
 * so is this — an indicator that reports "healthy" because nothing told it
 * otherwise is worse than no indicator.
 */

import { Card, Mono, Skeleton, StatusDot } from "../ui/primitives";
import type { Async, Health } from "../../lib/ui/api";

/**
 * Says plainly when nothing on this deployment is being kept.
 *
 * The store falls back to memory when Supabase is not configured, which means
 * a saved policy and every audit record vanish on the next cold start. That is
 * a reasonable default for local work and a trap for anyone evaluating the
 * deployed site: they change a rule, come back, and find it reverted with no
 * explanation. The status was already reported by /api/health — this puts it
 * where the consequence actually lands.
 */
export function EphemeralNotice({
  what,
  state,
}: {
  /** What will not survive, in the reader's terms. */
  what: string;
  state: Async<Health>;
}) {
  if (state.data?.store !== "memory") return null;

  return (
    <div className="mb-4 flex flex-wrap items-start gap-2.5 rounded-lg border border-warn-500/25 bg-warn-950/20 px-4 py-3">
      <span className="font-mono text-xs text-warn-400" aria-hidden="true">
        !
      </span>
      <p className="flex-1 text-[12px] leading-relaxed text-ink-200">
        <span className="font-medium text-warn-400">Not being saved. </span>
        This deployment is running without a database, so {what} is kept in
        memory and resets whenever the server restarts. Set{" "}
        <span className="font-mono text-ink-100">SUPABASE_URL</span> and{" "}
        <span className="font-mono text-ink-100">SUPABASE_SERVICE_ROLE_KEY</span>{" "}
        to persist it.
      </p>
    </div>
  );
}

export function SystemStatus({ state }: { state: Async<Health> }) {
  const { data, error, loading } = state;

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-3 w-full" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
          System
        </p>
        <div className="mt-3">
          <StatusDot tone="reject" label="Health check failed" />
        </div>
        <p className="mt-2 break-words font-mono text-[11px] text-mute-2">
          {error ?? "No response"}
        </p>
      </Card>
    );
  }

  const walletOk = Boolean(data.wallet?.address);
  const chainOk = data.onExpectedChain === true;

  return (
    <Card className="p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
        System
      </p>

      <dl className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-mute-2">Wallet</dt>
          <dd>
            <StatusDot
              tone={walletOk ? "approve" : "reject"}
              label={walletOk ? "Resolved" : "Unavailable"}
            />
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs text-mute-2">Network</dt>
          <dd>
            <StatusDot
              tone={chainOk ? "approve" : "warn"}
              label={data.wallet?.networkId ?? "unknown"}
            />
          </dd>
        </div>

        {data.store ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-mute-2">Storage</dt>
            <dd>
              <StatusDot
                tone={data.store === "supabase" ? "approve" : "warn"}
                label={data.store === "supabase" ? "Supabase" : "In memory"}
              />
            </dd>
          </div>
        ) : null}

        {data.depositAddressConfigured !== undefined ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-mute-2">Deposit address</dt>
            <dd>
              <StatusDot
                tone={data.depositAddressConfigured ? "approve" : "warn"}
                label={data.depositAddressConfigured ? "Configured" : "Not set"}
              />
            </dd>
          </div>
        ) : null}
      </dl>

      {data.store === "memory" ? (
        <p className="mt-3 border-t border-ink-800 pt-2.5 text-[11px] leading-relaxed text-mute-3">
          Storage is in memory — the audit trail and policy reset when the
          server restarts. Set <Mono>SUPABASE_URL</Mono> to persist.
        </p>
      ) : null}
    </Card>
  );
}
