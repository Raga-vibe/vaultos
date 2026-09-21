"use client";

/**
 * The meter.
 *
 * WHY THIS EXISTS
 *
 * VaultOS already counts the exact thing it would charge for. Every
 * authorization is written to the audit trail with its outcome, so the
 * billable unit is not something that would have to be invented and bolted
 * on later — it is the product's primary record, and it has been there since
 * the first commit.
 *
 * This panel makes that visible. It reads the same events the trail below it
 * renders and does nothing else: no pricing, no projections, no invented
 * figures. The numbers are counts of things that actually happened on this
 * wallet.
 *
 * REFUSALS ARE COUNTED SEPARATELY AND DELIBERATELY
 *
 * A refused action is the one most products would not bill for, and it is the
 * one VaultOS is most valuable for — it is the moment the limit paid for
 * itself. Showing refusals beside approvals is the honest version of the
 * business: you are paying for the decision, not for the transaction.
 */

import { Card, Mono } from "../ui/primitives";
import type { AuditEvent } from "../../lib/ui/api";

/** What the trail actually records, tallied. */
function tally(events: AuditEvent[]) {
  let decisions = 0;
  let refused = 0;
  let assessments = 0;
  let confirmed = 0;

  for (const e of events) {
    if (e.type === "POLICY_EVALUATED") {
      decisions += 1;
      if (e.verdict?.decision === "REJECTED") refused += 1;
    }
    if (e.type === "ASSESSMENT_RECEIVED") assessments += 1;
    if (e.type === "EXECUTION_CONFIRMED") confirmed += 1;
  }

  return { decisions, refused, assessments, confirmed };
}

function Figure({
  value,
  label,
  note,
  tone,
}: {
  value: number;
  label: string;
  note: string;
  tone?: "approve" | "reject";
}) {
  return (
    <div>
      <Mono
        className={
          tone === "reject"
            ? "block text-2xl leading-none text-reject-400"
            : tone === "approve"
              ? "block text-2xl leading-none text-approve-400"
              : "block text-2xl leading-none text-ink-50"
        }
      >
        {value}
      </Mono>
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-mute-1">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-mute-2">{note}</p>
    </div>
  );
}

export function DecisionMeter({ events }: { events: AuditEvent[] | null }) {
  if (!events || events.length === 0) return null;

  const t = tally(events);

  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-200">
          Metered
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-mute-2">
          The billable unit is the decision
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure
          value={t.decisions}
          label="Decisions"
          note="Every rule check, billed or not"
        />
        <Figure
          value={t.refused}
          label="Refused"
          note="Where the limit paid for itself"
          tone="reject"
        />
        <Figure
          value={t.assessments}
          label="SERV calls"
          note="Advisory, and optional"
        />
        <Figure
          value={t.confirmed}
          label="Confirmed"
          note="Settled on chain"
          tone="approve"
        />
      </div>

      <p className="mt-4 border-t border-ink-800 pt-3 text-[12px] leading-relaxed text-mute-1">
        VaultOS charges for the decision, not the transaction — which is why
        refusals are counted here too. A refused action is the one that cost
        you nothing and saved you everything.
      </p>
    </Card>
  );
}
