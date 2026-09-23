"use client";

/**
 * An opportunity, as one row of the list beside the decision.
 *
 * WHY A ROW, NOT A CARD
 *
 * The six opportunities used to be tall cards in a grid, with the decision
 * rendered underneath. Clicking one changed something below the fold, so on a
 * laptop the click appeared to do nothing — the one interaction the whole
 * product is built to show, and it looked broken.
 *
 * The page is now a list beside the decision. Each row carries only what a
 * reader needs to choose and to compare: which rule the move is here to test,
 * its name, its verdict, its risk and liquidity, and — when it was refused —
 * the reason in one line. Everything else lives in the decision panel, which
 * is always on screen next to the row that opened it.
 *
 * The verdict is the server's, from a dry run of the policy engine. The row
 * displays it; nothing here decides anything.
 */

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Pill, Skeleton, type Tone } from "../ui/primitives";
import { formatBps } from "../../lib/ui/format";
import {
  plainLiquidity,
  plainRefusal,
  plainRisk,
  whatThisTests,
} from "../../lib/ui/plain";
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
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Review ${opportunity.name}`}
      className={clsx(
        "group relative flex w-full flex-col rounded-lg border px-4 py-3 text-left transition-[background-color,border-color,transform] active:scale-[0.99]",
        selected
          ? "border-info-500/50 bg-ink-850"
          : "border-ink-700 bg-ink-900/60 hover:border-ink-600 hover:bg-ink-900",
      )}
    >
      {/* The selection marker slides from row to row, so the eye follows the
          click from the list to the panel it opened. */}
      {selected ? (
        <motion.span
          layoutId={reduce ? undefined : "opportunity-selected"}
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-info-500"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-info-500">
          Tests: {whatThisTests(opportunity)}
        </p>

        <div className="shrink-0">
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : verdict ? (
            /* Settles in when its dry run returns, so six answers arriving one
               by one read as six decisions being made — which they are. */
            <motion.span
              key={verdict.decision}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Pill
                tone={approved ? "approve" : "reject"}
                title={
                  approved
                    ? "Every rule passed."
                    : "A rule stopped this. Nothing moved."
                }
              >
                {approved ? "Allowed" : "Refused"}
              </Pill>
            </motion.span>
          ) : verdictError ? (
            <Pill tone="warn" title={verdictError}>
              No verdict
            </Pill>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-medium text-ink-50">
          {opportunity.name}
        </h3>
        <span
          className="shrink-0 font-mono text-[12px] text-mute-2"
          title="The return it advertises. Not a promise, and not why it passes or fails."
        >
          {formatBps(opportunity.estimatedApyBps)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

      {/* The reason, when there is one. One line of it is enough to compare
          rows; the full explanation is in the panel. */}
      {primaryRule ? (
        <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-reject-400/90">
          {plainRefusal(primaryRule)}
        </p>
      ) : null}
    </button>
  );
}
