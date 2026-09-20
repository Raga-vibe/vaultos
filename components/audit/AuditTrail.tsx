"use client";

/**
 * The audit trail.
 *
 * A system record, not an activity feed. Every row is an event the server
 * actually wrote; nothing here is synthesised to fill a gap. Rows expand to
 * the raw detail because the point of an audit log is that someone can check
 * it, and a summary you cannot drill into is a summary you have to trust.
 */

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Card, CopyButton, ErrorNote, Mono, Pill, Skeleton, type Tone } from "../ui/primitives";
import { formatTime } from "../../lib/ui/format";
import type { AuditEvent } from "../../lib/ui/api";

/** Tone and label for each event type. */
const EVENT_META: Record<string, { tone: Tone; label: string }> = {
  POLICY_UPDATED: { tone: "info", label: "You changed a rule" },
  ASSESSMENT_REQUESTED: { tone: "neutral", label: "Asked the AI" },
  ASSESSMENT_RECEIVED: { tone: "neutral", label: "AI answered" },
  ASSESSMENT_REJECTED: { tone: "warn", label: "AI answer thrown out" },
  POLICY_EVALUATED: { tone: "info", label: "Rules checked" },
  EXECUTION_SUBMITTED: { tone: "warn", label: "Money sent" },
  EXECUTION_CONFIRMED: { tone: "approve", label: "Confirmed on chain" },
  EXECUTION_FAILED: { tone: "reject", label: "Move failed" },
  OPPORTUNITY_SOURCED: { tone: "neutral", label: "Opportunity found" },
};

function Row({ event }: { event: AuditEvent }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const meta = EVENT_META[event.type] ?? { tone: "neutral" as Tone, label: event.type };
  const hash = typeof event.detail.hash === "string" ? event.detail.hash : null;

  return (
    <li className="border-b border-ink-800 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-850/50"
      >
        <Mono className="w-14 shrink-0 pt-0.5 text-[10px] text-mute-3">
          #{event.seq}
        </Mono>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={meta.tone}>{meta.label}</Pill>

            {event.verdict ? (
              <Pill
                tone={event.verdict.decision === "APPROVED" ? "approve" : "reject"}
              >
                {event.verdict.decision}
              </Pill>
            ) : null}

            {event.opportunityId ? (
              <Mono className="truncate text-[11px] text-mute-2">
                {event.opportunityId}
              </Mono>
            ) : null}
          </div>

          {event.verdict && event.verdict.violations.length > 0 ? (
            <p className="mt-1.5 font-mono text-[11px] text-reject-400">
              {event.verdict.violations.map((v) => v.code).join(", ")}
            </p>
          ) : null}

          {hash ? (
            <Mono className="mt-1.5 block truncate text-[11px] text-mute-1">
              {hash}
            </Mono>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Mono className="text-[10px] text-mute-3">{formatTime(event.at)}</Mono>
          <span
            className={clsx(
              "text-mute-3 transition-transform",
              open && "rotate-90",
            )}
            aria-hidden="true"
          >
            ›
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-ink-800 bg-ink-950/60 px-4 py-3">
              {hash ? (
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton value={hash} label="Copy hash" />
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded border border-ink-700 px-2 py-1 font-mono text-[11px] text-info-500 hover:border-info-500/50"
                  >
                    View on BaseScan ↗
                  </a>
                </div>
              ) : null}

              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-mute-3">
                  Detail
                </p>
                <pre className="overflow-x-auto rounded border border-ink-800 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-300">
                  {JSON.stringify(event.detail, null, 2)}
                </pre>
              </div>

              {event.verdict ? (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-mute-3">
                    Verdict
                  </p>
                  <pre className="overflow-x-auto rounded border border-ink-800 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-300">
                    {JSON.stringify(event.verdict, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function AuditTrail({
  events,
  loading,
  error,
  onRetry,
  limit,
}: {
  events: AuditEvent[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  limit?: number;
}) {
  if (error) return <ErrorNote message={error} onRetry={onRetry} />;

  if (loading || !events) {
    return (
      <Card className="p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="px-4 py-10 text-center">
        <p className="text-sm text-mute-1">Nothing recorded yet.</p>
        <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-mute-3">
          Check an opportunity and it shows up here — what was asked, what was
          decided, and which rule decided it.
        </p>
      </Card>
    );
  }

  const shown = limit ? events.slice(-limit).reverse() : [...events].reverse();

  return (
    <Card className="overflow-hidden">
      <ul>
        {shown.map((e) => (
          <Row key={`${e.seq}-${e.at}`} event={e} />
        ))}
      </ul>
    </Card>
  );
}
