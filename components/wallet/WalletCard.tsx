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
      <Card className="p-5 sm:p-6" aria-busy="true">
        {/* Named, not a generic shimmer. A reader waiting on a balance should
            know which of the several network round trips they are waiting on. */}
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
          Reading wallet&hellip;
        </p>
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
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={onBaseSepolia ? "approve" : "reject"}>
              {data.wallet.networkId ?? "unknown network"}
            </Pill>
            {/* Testnet context never gets hidden behind a hover or a footnote:
                this card looks exactly like one holding real money. */}
            <Pill tone="warn" title="Test network — these balances have no monetary value">
              Testnet
            </Pill>
          </div>
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
          <a
            href={`https://sepolia.basescan.org/address/${data.wallet.address}`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded border border-ink-700 px-2 py-1 font-mono text-[11px] text-info-500 transition-colors hover:border-info-500/50"
          >
            View on BaseScan ↗
          </a>
          <span className="ml-auto font-mono text-[11px] text-mute-2">
            chain {data.wallet.chainId ?? "—"}
          </span>
        </div>
      </div>
    </Card>
  );
}
