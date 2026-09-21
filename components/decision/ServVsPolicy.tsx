"use client";

/**
 * SERV beside the Policy Engine.
 *
 * The most important composition in this application, and the reason it is
 * two panels rather than one merged "AI decision": the product's entire claim
 * is that these are different kinds of thing. One is an opinion. The other is
 * an authorisation. Merging them on screen would undo in the design what the
 * architecture spent its effort separating.
 *
 * So the panels are visibly distinct, each is labelled with what it can do,
 * and when they disagree the disagreement is presented as evidence rather
 * than as an error. No red banner. No "conflict detected". A quiet line
 * saying the boundary held.
 */

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Card,
  Field,
  Mono,
  Pill,
  SafetyDecision,
  Skeleton,
  type Tone,
} from "../ui/primitives";
import { PLAIN_RULES, RULE_FOR_CODE, plainRefusal } from "../../lib/ui/plain";
import type { Assessment, Policy, Verdict } from "../../lib/ui/api";

/** Maps a band to a tone for display only. Carries no authority. */
function bandTone(band: string): Tone {
  return band === "HIGH" ? "reject" : band === "MEDIUM" ? "warn" : "approve";
}

/**
 * True when SERV's leaning and the policy's verdict point opposite ways.
 *
 * SERV "leans approve" when it recommends putting something in. This is a
 * presentation-layer reading of an advisory opinion — it is never used to
 * decide anything, and the policy verdict is taken verbatim from the server.
 *
 * @param assessment - The advisory assessment, if any.
 * @param verdict - The authoritative verdict, if any.
 * @returns Whether to surface the disagreement note.
 */
export function disagrees(
  assessment: Assessment | null,
  verdict: Verdict | null,
): boolean {
  if (!assessment || !verdict) return false;
  const servLeansApprove = assessment.recommendedAllocationPercent > 0;
  const policyApproved = verdict.decision === "APPROVED";
  return servLeansApprove !== policyApproved;
}

function PanelHeading({
  title,
  gloss,
  role,
  tone,
}: {
  title: string;
  /** The same thing said without jargon, for a first-time reader. */
  gloss: string;
  role: string;
  tone: "advisory" | "authoritative";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-800 px-4 py-3">
      <div className="min-w-0">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-100">
          {title}
        </h3>
        <p className="mt-0.5 text-[12px] leading-snug text-mute-1">{gloss}</p>
      </div>
      <span
        className={clsx(
          "shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
          tone === "authoritative"
            ? "border-approve-500/40 bg-approve-950/50 text-approve-400"
            : "border-ink-600 bg-ink-850 text-mute-1",
        )}
      >
        {role}
      </span>
    </div>
  );
}


/**
 * The one line that makes the architecture visible.
 *
 * Two numbers beside each other — what the model suggested, and what the rules
 * permit — then the verdict, then the rule that produced it. Everything else
 * on this screen elaborates; this is the claim itself, and it is the only part
 * that has to survive being read at a glance from the back of a room.
 *
 * It renders only once both answers exist. A half-filled comparison would
 * invite the reader to complete it themselves, which is exactly the inference
 * this product spends its effort preventing.
 */
function Contrast({
  assessment,
  verdict,
  policy,
}: {
  assessment: Assessment;
  verdict: Verdict;
  policy: Policy | null;
}) {
  const refused = verdict.decision === "REJECTED";
  const code = verdict.violations[0]?.code ?? null;
  const field = code ? RULE_FOR_CODE[code] : undefined;
  const rule = field ? PLAIN_RULES[field] : undefined;

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/70 p-4">
      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-mute-1">
            SERV recommends
          </p>
          <Mono className="mt-1 block text-2xl leading-none text-ink-200">
            {assessment.recommendedAllocationPercent}%
          </Mono>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-mute-1">
            Your policy allows
          </p>
          <Mono className="mt-1 block text-2xl leading-none text-ink-200">
            {policy ? `${policy.maxAllocationPercent}%` : "—"}
          </Mono>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-mute-1">
            Policy verdict
          </p>
          <span
            className={clsx(
              "mt-1 block font-mono text-2xl leading-none tracking-tight",
              refused ? "text-reject-400" : "text-approve-400",
            )}
          >
            <span aria-hidden="true">{refused ? "× " : "✓ "}</span>
            {refused ? "REFUSED" : "ALLOWED"}
          </span>
        </div>
      </div>

      {refused && rule ? (
        <p className="mt-4 border-t border-ink-800 pt-3 text-[13px] leading-relaxed text-ink-200">
          <span className="text-mute-1">Deciding rule: </span>
          {rule.title}
          <Mono className="ml-2 text-[11px] text-reject-400/90">{code}</Mono>
        </p>
      ) : null}
    </div>
  );
}

export function ServVsPolicy({
  assessment,
  assessmentError,
  assessing,
  verdict,
  evaluating,
  policy,
}: {
  assessment: Assessment | null;
  assessmentError: string | null;
  assessing: boolean;
  verdict: Verdict | null;
  evaluating: boolean;
  /** The active policy, so the comparison can name the limit it hit. */
  policy: Policy | null;
}) {
  const reduce = useReducedMotion();
  const conflict = disagrees(assessment, verdict);

  return (
    <div className="space-y-3">
      {assessment && verdict ? (
        <Contrast assessment={assessment} verdict={verdict} policy={policy} />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {/* ── SERV ─────────────────────────────────────────────────── */}
        <Card className="flex flex-col">
          <PanelHeading
            title="What SERV thinks"
            gloss="SERV Reasoning — the AI that looks at the move"
            role="Suggestion"
            tone="advisory"
          />

          <div className="flex-1 p-4">
            {assessing ? (
              <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ) : assessmentError ? (
              /*
                A failed assessment is amber, never red, and it says out loud
                that nothing downstream depends on it. Red here would be a
                double lie: it would read as a policy refusal, and it would
                imply the decision is now blocked. Neither is true — SERV is
                advisory, so the policy verdict is exactly what it would have
                been had nobody asked the model at all.
              */
              <div
                role="alert"
                className="rounded border border-warn-500/35 bg-warn-950/25 p-3"
              >
                <p className="text-[13px] font-medium text-warn-400">
                  <span aria-hidden="true">! </span>
                  Couldn&rsquo;t get an assessment
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-200">
                  This is a system error, not a decision. SERV is advisory, so
                  your policy verdict is unaffected — you can check your rules
                  and execute without it.
                </p>
                <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-mute-1">
                  {assessmentError}
                </p>
              </div>
            ) : !assessment ? (
              <p className="text-sm leading-relaxed text-mute-2">
                Nothing asked yet. Whatever SERV says changes nothing on its own.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Risk it sees">
                    <Pill tone={bandTone(assessment.riskAssessment)}>
                      {assessment.riskAssessment}
                    </Pill>
                  </Field>
                  <Field label="Ease of exit">
                    <Pill tone={bandTone(assessment.liquidityAssessment) === "reject" ? "approve" : bandTone(assessment.liquidityAssessment)}>
                      {assessment.liquidityAssessment}
                    </Pill>
                  </Field>
                  <Field label="How sure">
                    <Mono className="text-sm text-ink-200">
                      {assessment.confidence}
                    </Mono>
                  </Field>
                </div>

                <Field
                  label="How much it suggests"
                  hint="A suggestion. Your limit is separate."
                >
                  <Mono className="text-2xl text-ink-100">
                    {assessment.recommendedAllocationPercent}%
                  </Mono>
                </Field>

                <Field label="In its words">
                  <p className="text-sm leading-relaxed text-ink-300">
                    {assessment.summary}
                  </p>
                </Field>

                {assessment.concerns.length > 0 ? (
                  <Field label="What worries it">
                    <ul className="space-y-1">
                      {assessment.concerns.map((c) => (
                        <li
                          key={c}
                          className="flex gap-2 text-[13px] leading-relaxed text-mute-1"
                        >
                          <span className="text-warn-500" aria-hidden="true">
                            !
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </Field>
                ) : null}
              </div>
            )}
          </div>

          <p className="border-t border-ink-800 px-4 py-2.5 text-[11px] text-mute-2">
SERV suggests. It cannot approve anything.
          </p>
        </Card>

        {/* ── Policy engine ────────────────────────────────────────── */}
        <Card className="flex flex-col">
          <PanelHeading
            title="What your rules say"
            gloss="Plain code that never sees SERV. Only this can say yes."
            role="Decides"
            tone="authoritative"
          />

          <div className="flex-1 p-4">
            {evaluating ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : !verdict ? (
              <p className="text-sm leading-relaxed text-mute-2">
                Not checked yet.
              </p>
            ) : (
              <div className="space-y-4">
                {/*
                  A refusal is not a failure state, and must never be dressed
                  as one. It is the only moment where the product's central
                  claim becomes observable — so it is headed as a decision the
                  system got right, and the rules that produced it are named.
                */}
                {verdict.decision === "REJECTED" ? (
                  <SafetyDecision
                    headline={
                      verdict.violations.length === 1
                        ? "One of your rules stopped this. Nothing moved."
                        : `${verdict.violations.length} of your rules stopped this. Nothing moved.`
                    }
                  >
                    <ul className="mt-3 space-y-2">
                      {verdict.violations.map((v) => (
                        <li
                          key={v.code}
                          className="rounded border border-reject-500/25 bg-reject-950/30 px-3 py-2.5"
                        >
                          <p className="text-[13px] leading-relaxed text-ink-200">
                            {plainRefusal(v.code)}
                          </p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-mute-1">
                            {v.message}
                          </p>
                          <Mono className="mt-1.5 block text-[10px] text-reject-400/90">
                            {v.code}
                          </Mono>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-[11px] leading-relaxed text-mute-1">
                      Want this allowed? Change the rule, not the AI.
                    </p>
                  </SafetyDecision>
                ) : (
                  <Field label="Decision">
                    <span className="font-mono text-2xl tracking-tight text-approve-400">
                      <span aria-hidden="true">✓ </span>
                      APPROVED
                    </span>
                  </Field>
                )}

                {verdict.decision === "APPROVED" &&
                verdict.requiresManualApproval ? (
                  <p className="rounded border border-warn-500/30 bg-warn-950/30 px-3 py-2 text-[13px] text-warn-400">
                    <span aria-hidden="true">! </span>
                    Allowed by your rules — but you asked to confirm each move
                    yourself, so nothing will happen until you say go.
                  </p>
                ) : null}

                {verdict.allocationBps !== null ? (
                  <Field label="Share of your money">
                    <Mono className="text-sm text-ink-200">
                      {(verdict.allocationBps / 100).toFixed(2)}%
                    </Mono>
                  </Field>
                ) : null}

                <Field
                  label="Rules checked"
                  hint="A checklist, not a guess."
                >
                  <div className="flex flex-wrap gap-1.5">
                    {verdict.evaluated.map((e) => (
                      <span
                        key={e}
                        className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-mute-1"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </div>

          <p className="border-t border-ink-800 px-4 py-2.5 text-[11px] text-mute-2">
Same question, same answer, every time. Never based on what SERV said.
          </p>
        </Card>
      </div>

      {/* ── Disagreement ───────────────────────────────────────────── */}
      <AnimatePresence>
        {conflict ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-lg border border-ink-700 bg-ink-850/60 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1">
                They disagree — that is the point
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">
                The AI{" "}
                {assessment && assessment.recommendedAllocationPercent > 0
                  ? `suggested putting in ${assessment.recommendedAllocationPercent}%`
                  : "advised against this"}
                , and your rules{" "}
                {verdict?.decision === "APPROVED" ? "allowed it" : "said no"}
                . Nothing is broken: the rules never saw SERV&rsquo;s answer.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
