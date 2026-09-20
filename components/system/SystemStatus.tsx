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
