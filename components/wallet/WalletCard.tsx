"use client";

/**
 * The wallet.
 *
 * The balance is the largest thing on the screen because it is the number
 * every other decision is measured against. Everything shown here comes from
 * GET /api/wallet — no figure on this card is computed in the browser.
 */

import { AnimatedNumber, Card, CopyButton, ErrorNote, Mono, Pill, Skeleton } from "../ui/primitives";
import { formatAtomic, truncateAddress } from "../../lib/ui/format";
import type { Async, WalletInfo } from "../../lib/ui/api";

export function WalletCard({ state }: { state: Async<WalletInfo> }) {
  const { data, error, loading, reload } = state;

  if (error) return <ErrorNote message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <Card className="p-5 sm:p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-12 w-56" />
        <Skeleton className="mt-6 h-3 w-72" />
      </Card>
    );
  }

  const onBaseSepolia = data.wallet.chainId === "84532";

  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.35]" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
            Agent wallet
          </span>
          <Pill tone={onBaseSepolia ? "approve" : "reject"}>
            {data.wallet.networkId ?? "unknown network"}
          </Pill>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <AnimatedNumber
            value={formatAtomic(data.usdc.atomic, data.usdc.decimals, 6)}
            className="font-mono text-4xl font-medium leading-none tracking-tight text-ink-50 sm:text-5xl"
          />
          <span className="font-mono text-sm text-mute-1">USDC</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-mute-1">
            <Mono className="text-ink-200">
              {formatAtomic(data.wallet.nativeBalanceWei, 18, 6)}
            </Mono>{" "}
            ETH
            <span className="ml-1.5 text-[11px] text-mute-2">for gas</span>
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-4">
          <Mono className="text-xs text-ink-300" title={data.wallet.address}>
            {truncateAddress(data.wallet.address, 10, 8)}
          </Mono>
          <CopyButton value={data.wallet.address} label="Copy address" />
          <span className="ml-auto font-mono text-[11px] text-mute-2">
            chain {data.wallet.chainId ?? "—"}
          </span>
        </div>
      </div>
    </Card>
  );
}
