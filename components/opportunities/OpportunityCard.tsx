"use client";

/**
 * An opportunity, with its verdict and the rule that produced it.
 *
 * The rule name is the product. "REJECTED" tells a user nothing they can act
 * on; "LEVERAGE_NOT_ALLOWED" tells them exactly which boundary they set is
 * doing the work, and lets them change it if they meant something else. So
 * the code is shown verbatim, in monospace, with a plain-English gloss under
 * it — not instead of it.
 *
 * The fixture label is not decoration either. These are seeded testnet
 * records, and a card that looked like a live yield product would be lying.
 */

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Card, Mono, Pill, Skeleton, type Tone } from "../ui/primitives";
import { formatBps } from "../../lib/ui/format";
import { plainLiquidity, plainRefusal, plainRisk } from "../../lib/ui/plain";
import type { Opportunity, Verdict } from "../../lib/ui/api";

function riskTone(band: string): Tone {
  return band === "HIGH" ? "reject" : band === "MEDIUM" ? "warn" : "approve";
}

function liquidityTone(band: string): Tone {
  return band === "LOW" ? "reject" : band === "MEDIUM" ? "warn" : "approve";
}

export function OpportunityCard({
  opportunity,
  verdict,
  verdictError,
  loading,
  selected,
  onSelect,
}: {
  opportunity: Opportunity;
  verdict: Verdict | null;
  /** Why no verdict, when one could not be obtained. */
  verdictError?: string | null;
  loading: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();
  const approved = verdict?.decision === "APPROVED";
  const primaryRule = verdict?.violations[0]?.code ?? null;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Card
        className={clsx(
          "flex h-full flex-col transition-colors",
          selected ? "border-info-500/50" : "hover:border-ink-600",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Review ${opportunity.name}`}
          className="flex flex-1 flex-col p-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-ink-50">
                {opportunity.name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[11px] text-mute-2">
                {opportunity.protocol}
              </p>
            </div>

            {loading ? (
              <Skeleton className="h-5 w-20" />
            ) : verdict ? (
              <Pill
                tone={approved ? "approve" : "reject"}
                title={
                  approved
                    ? "Every rule you set passed."
                    : "A rule you set refused this. Nothing moved."
                }
              >
                {approved ? "Allowed" : "Refused"}
              </Pill>
            ) : verdictError ? (
              <Pill tone="warn">No verdict</Pill>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Pill tone={riskTone(opportunity.risk)}>
              {plainRisk(opportunity.risk)}
            </Pill>
            <Pill tone={liquidityTone(opportunity.liquidity)}>
              {plainLiquidity(opportunity.liquidity)}
            </Pill>
            {opportunity.usesLeverage ? (
              <Pill tone="warn" title="Borrows money to invest">
                Borrows to invest
              </Pill>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-800 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-mute-2">
                Asset
              </p>
              <Mono className="text-sm text-ink-200">
                {opportunity.tokenSymbol}
              </Mono>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-mute-2">
                Claimed return
              </p>
              <Mono className="text-sm text-ink-200">
                {formatBps(opportunity.estimatedApyBps)}
              </Mono>
            </div>
          </div>

          {/* What was proposed, in the units the allocation cap is written in.
              Without it a refusal for exceeding a cap has nothing to exceed. */}
          {verdict && verdict.allocationBps !== null ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-ink-800 pt-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-mute-2">
                Proposed share of wallet
              </p>
              <Mono className="text-sm text-ink-200">
                {(verdict.allocationBps / 100).toFixed(2)}%
              </Mono>
            </div>
          ) : null}

          {/* The reason. This is why the card exists. */}
          <div className="mt-3 min-h-[3.25rem]">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : primaryRule ? (
              /* A refused card is not a broken card. The green micro-label
                 says so before the red does, so the grid reads as three
                 boundaries holding rather than three things going wrong. */
              <div className="rounded border border-reject-500/25 bg-reject-950/25 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-approve-400">
                  ✓ Boundary held
                </p>
                <p className="mt-1 text-[12px] leading-snug text-ink-200">
                  {plainRefusal(primaryRule)}
                </p>
                <Mono className="mt-1.5 block text-[10px] text-reject-400/90">
                  {primaryRule}
                  {verdict && verdict.violations.length > 1
                    ? ` +${verdict.violations.length - 1}`
                    : ""}
                </Mono>
              </div>
            ) : verdict ? (
              <div className="rounded border border-approve-500/25 bg-approve-950/25 px-2.5 py-2">
                <p className="text-[12px] leading-snug text-ink-200">
                  {verdict.requiresManualApproval
                    ? "Passes every rule you set. Waiting for you to confirm."
                    : "Passes every rule you set. Cleared to go ahead."}
                </p>
                <Mono className="mt-1.5 block text-[10px] text-approve-400/80">
                  ALL {verdict.evaluated.length} CHECKS PASSED
                </Mono>
              </div>
            ) : verdictError ? (
              /* An unreachable engine is reported as unknown, never as a pass.
                 A blank space here would read as "nothing wrong". */
              <div className="rounded border border-warn-500/25 bg-warn-950/25 px-2.5 py-2">
                <p className="text-[12px] leading-snug text-ink-200">
                  Couldn&rsquo;t check this one right now.
                </p>
                <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-snug text-warn-400/80">
                  {verdictError}
                </p>
              </div>
            ) : null}
          </div>
        </button>

        {/* The review affordance, stated in words. A card that only responded
            to being clicked gave no hint that clicking was the point. */}
        <div className="flex items-center justify-between gap-2 border-t border-ink-800 px-4 py-2">
          <p className="text-[10px] text-mute-3">Example · test network</p>
          <span
            className={clsx(
              "font-mono text-[10px] uppercase tracking-wider",
              selected ? "text-info-500" : "text-mute-1",
            )}
          >
            {selected ? "Reviewing ↓" : "Review →"}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
