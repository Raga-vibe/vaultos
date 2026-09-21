"use client";

/**
 * The testnet notice.
 *
 * A dark interface full of balances and transaction hashes looks exactly like
 * one holding real money. It is not, and letting anyone believe otherwise for
 * even a moment would be a form of lying — so this says so plainly, near the
 * balance, rather than in small print at the bottom.
 */

export function TestnetNotice() {
  return (
    <div className="flex flex-wrap items-start gap-2.5 rounded-lg border border-warn-500/25 bg-warn-950/25 px-4 py-3">
      <span className="font-mono text-xs text-warn-400" aria-hidden="true">
        !
      </span>
      <p className="flex-1 text-[13px] leading-relaxed text-ink-300">
        <span className="font-medium text-warn-400">Test network.</span>{" "}
        The wallet and transactions are real and you can look them up — but the
        money has no value and nothing here earns anything.
      </p>
    </div>
  );
}
