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
import Link from "next/link";
import { useState } from "react";
import { Card, CopyButton, ErrorNote, Mono, Pill, Skeleton, type Tone } from "../ui/primitives";
import { formatTime } from "../../lib/ui/format";
import { plainRefusal } from "../../lib/ui/plain";
import type { AuditEvent } from "../../lib/ui/api";

/**
 * Tone, audit verb and plain gloss for each event type.
 *
 * The verb is the one an audit trail should use — ASSESSED, ALLOWED, REFUSED,
 * EXECUTED, CONFIRMED — because that is the vocabulary someone reconstructing
 * what happened will scan for. The gloss underneath is for everyone else.
 *
 * EXECUTION_FAILED is amber, not red. Red in this product means a policy
 * refusal; a transaction that did not land is a system fault, and giving the
 * two the same colour would blur the only distinction this log exists to keep.
 */
const EVENT_META: Record<
  string,
  { tone: Tone; label: string; gloss: string }
> = {
  POLICY_UPDATED: {
    tone: "info",
    label: "Policy updated",
    gloss: "You changed a rule",
  },
  ASSESSMENT_REQUESTED: {
    tone: "neutral",
    label: "Assessment requested",
    gloss: "SERV was asked",
  },
  ASSESSMENT_RECEIVED: {
    tone: "neutral",
    label: "Assessed",
    gloss: "SERV answered — a suggestion",
  },
  ASSESSMENT_REJECTED: {
    tone: "warn",
    label: "Assessment discarded",
    gloss: "SERV's answer was unreadable and thrown away",
  },
  POLICY_EVALUATED: {
    tone: "info",
    label: "Policy verified",
    gloss: "Every rule checked",
  },
  EXECUTION_SUBMITTED: {
    tone: "warn",
    label: "Executed",
    gloss: "Transaction submitted to the chain",
  },
  EXECUTION_CONFIRMED: {
    tone: "approve",
    label: "Transaction confirmed",
    gloss: "Included in a block on Base Sepolia",
  },
  EXECUTION_FAILED: {
    tone: "warn",
    label: "Execution failed",
    gloss: "Something broke — not a decision",
  },
  OPPORTUNITY_SOURCED: {
    tone: "neutral",
    label: "Opportunity sourced",
    gloss: "A move was read from the examples",
  },
};

function Row({ event }: { event: AuditEvent }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const meta =
    EVENT_META[event.type] ??
    { tone: "neutral" as Tone, label: event.type, gloss: "" };
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
                {event.verdict.decision === "APPROVED" ? "Allowed" : "Refused"}
              </Pill>
            ) : null}

            {event.opportunityId ? (
              <Mono className="truncate text-[11px] text-mute-2">
                {event.opportunityId}
              </Mono>
            ) : null}
          </div>

          {meta.gloss ? (
            <p className="mt-1 text-[11px] leading-snug text-mute-1">
              {meta.gloss}
            </p>
          ) : null}

          {event.verdict && event.verdict.violations.length > 0 ? (
            <div className="mt-1.5 space-y-0.5">
              {event.verdict.violations.map((v) => (
                <p key={v.code} className="text-[11px] leading-snug text-reject-400">
                  {plainRefusal(v.code)}
                  <Mono className="ml-1.5 text-[10px] text-mute-3">{v.code}</Mono>
                </p>
              ))}
            </div>
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

/**
 * Views onto the trail.
 *
 * An audit log's problem is not density, it is that the interesting rows are
 * buried among the routine ones. After a few minutes of use there are dozens
 * of entries and the three that matter — the refusals and the confirmed
 * transaction — are somewhere in the middle. These are not filters in the
 * data sense; the underlying record is untouched and append-only. They are
 * ways of looking at it.
 *
 * "Refusals" is first after All, because that is the view this product exists
 * to produce.
 */
const VIEWS = [
  { key: "all", label: "Everything" },
  {
    key: "refusals",
    label: "Refusals",
    match: (e: AuditEvent) => e.verdict?.decision === "REJECTED",
  },
  {
    key: "decisions",
    label: "Decisions",
    match: (e: AuditEvent) => e.type === "POLICY_EVALUATED",
  },
  {
    key: "chain",
    label: "On chain",
    match: (e: AuditEvent) =>
      e.type === "EXECUTION_SUBMITTED" ||
      e.type === "EXECUTION_CONFIRMED" ||
      e.type === "EXECUTION_FAILED",
  },
  {
    key: "serv",
    label: "SERV",
    match: (e: AuditEvent) => e.type.startsWith("ASSESSMENT_"),
  },
] as const;

export function AuditTrail({
  events,
  loading,
  error,
  onRetry,
  limit,
  filterable = false,
}: {
  events: AuditEvent[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  limit?: number;
  /** Show the view switcher. Off for the five-row summary on Overview. */
  filterable?: boolean;
}) {
  const [view, setView] = useState<string>("all");
  if (error) return <ErrorNote message={error} onRetry={onRetry} />;

  if (loading || !events) {
    return (
      <Card className="p-4" aria-busy="true">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
          Loading audit trail&hellip;
        </p>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (events.length === 0) {
    // An empty state says what is empty, why, and what to do about it. The
    // third part is the one usually missing, and it is the only part that
    // moves anybody forward.
    return (
      <Card className="px-4 py-10 text-center">
        <p className="text-sm text-ink-200">No activity yet.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-mute-1">
          Nothing has been assessed or decided on this wallet. Review an
          opportunity to create your first audit record.
        </p>
        <Link
          href="/app/opportunities"
          className="mt-5 inline-flex items-center gap-2 rounded border border-approve-500/45 bg-approve-950/40 px-3.5 py-2 text-[13px] font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/70"
        >
          Review an opportunity
          <span aria-hidden="true">→</span>
        </Link>
      </Card>
    );
  }

  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const matched =
    "match" in active && active.match
      ? events.filter(active.match)
      : events;

  const shown = limit
    ? matched.slice(-limit).reverse()
    : [...matched].reverse();

  return (
    <div>
      {filterable ? (
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter the trail">
          {VIEWS.map((v) => {
            const count =
              "match" in v && v.match ? events.filter(v.match).length : events.length;
            const selected = v.key === view;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={selected}
                className={clsx(
                  "rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                  selected
                    ? "border-ink-500 bg-ink-800 text-ink-50"
                    : "border-ink-700 text-mute-1 hover:border-ink-600 hover:text-ink-200",
                )}
              >
                {v.label}
                <span className="ml-1.5 text-mute-2">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-mute-1">
            Nothing recorded under &ldquo;{active.label}&rdquo; yet.
          </p>
        ) : (
          <ul>
            {shown.map((e) => (
              <Row key={`${e.seq}-${e.at}`} event={e} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
