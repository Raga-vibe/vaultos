"use client";

/**
 * The workbench: one opportunity, taken through the pipeline.
 *
 * This is where the product's claim is demonstrated rather than asserted. The
 * user picks an amount, asks SERV what it thinks, asks the policy engine for
 * a verdict, and — only if the verdict permits — executes.
 *
 * Three things this component deliberately does NOT do:
 *
 *   It does not compute a verdict. Every decision shown comes from
 *   POST /api/evaluate. Nothing in the browser decides whether a constraint
 *   is satisfied, which is the same rule that keeps SERV out of the engine.
 *
 *   It does not enable Execute on its own reasoning. The button unlocks only
 *   when the server returned APPROVED without requiresManualApproval.
 *
 *   It does not show a success state without a transaction hash. "Confirmed"
 *   appears when the backend returns one, and not a moment earlier.
 */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import {
  Button,
  Card,
  CopyButton,
  ErrorNote,
  Field,
  Mono,
  Pill,
  SafetyDecision,
  SectionHeader,
} from "../ui/primitives";
import { DecisionFlow, type FlowStage } from "./DecisionFlow";
import { ServVsPolicy } from "./ServVsPolicy";
import { formatAtomic } from "../../lib/ui/format";
import {
  api,
  useAsync,
  type Assessment,
  type EvaluateResult,
  type ExecuteResult,
  type Opportunity,
} from "../../lib/ui/api";

/**
 * What to say while a stage is in flight.
 *
 * Only the states that involve waiting get a line. A settled stage needs no
 * narration — the panels below it already say what happened.
 */
const STAGE_LABEL: Partial<Record<FlowStage, string>> = {
  assessing: "Asking SERV…",
  evaluating: "Checking your rules…",
  executing: "Submitting transaction…",
};

export function Workbench({
  opportunity,
  onActivity,
}: {
  opportunity: Opportunity;
  onActivity?: () => void;
}) {
  const reduce = useReducedMotion();

  // The active policy, read so the comparison can state the limit in the same
  // units SERV used. Cached by the api client, so this is not a second fetch
  // on top of the one the page already made.
  const policy = useAsync(() => api.policy(), []);

  // Whether this deployment has a destination for transfers at all. Without
  // OPPORTUNITY_DEPOSIT_ADDRESS the server refuses to guess one, so Execute
  // would fail on click — better to say so before the click than after.
  const health = useAsync(() => api.health(), []);
  const canReachChain = health.data?.depositAddressConfigured !== false;

  const [amount, setAmount] = useState("0.01");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);

  const [evaluation, setEvaluation] = useState<EvaluateResult | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const [execution, setExecution] = useState<ExecuteResult | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  /**
   * Discards every prior answer.
   *
   * Changing the amount invalidates the assessment, the verdict and the
   * execution: leaving a stale verdict on screen beside a new amount would
   * be a lie about what the server actually said. Called from the input's
   * change handler rather than an effect, and the parent remounts this
   * component when the opportunity changes.
   */
  function invalidate() {
    setAssessment(null);
    setAssessmentError(null);
    setEvaluation(null);
    setEvaluateError(null);
    setExecution(null);
    setExecuteError(null);
  }

  /** The stage the pipeline has genuinely reached. */
  const stage: FlowStage = executing
    ? "executing"
    : execution?.transaction
      ? "confirmed"
      : executeError
        ? "failed"
        : evaluating
          ? "evaluating"
          : evaluation
            ? evaluation.verdict.decision === "REJECTED"
              ? "rejected"
              : evaluation.verdict.requiresManualApproval
                ? "awaiting"
                : "approved"
            : assessing
              ? "assessing"
              : assessment
                ? "assessing"
                : "idle";

  const assess = useCallback(async () => {
    setAssessing(true);
    setAssessmentError(null);
    try {
      const { assessment: a } = await api.assess(opportunity.id);
      setAssessment(a);
    } catch (e) {
      setAssessmentError(e instanceof Error ? e.message : String(e));
    } finally {
      setAssessing(false);
      onActivity?.();
    }
  }, [opportunity.id, onActivity]);

  const evaluate = useCallback(async () => {
    setEvaluating(true);
    setEvaluateError(null);
    try {
      setEvaluation(await api.evaluate(opportunity.id, amount));
    } catch (e) {
      setEvaluateError(e instanceof Error ? e.message : String(e));
    } finally {
      setEvaluating(false);
      onActivity?.();
    }
  }, [opportunity.id, amount, onActivity]);

  const execute = useCallback(async () => {
    setExecuting(true);
    setExecuteError(null);
    try {
      setExecution(await api.execute(opportunity.id, amount));
    } catch (e) {
      setExecuteError(e instanceof Error ? e.message : String(e));
    } finally {
      setExecuting(false);
      onActivity?.();
    }
  }, [opportunity.id, amount, onActivity]);

  const canExecute =
    evaluation?.verdict.decision === "APPROVED" &&
    !evaluation.verdict.requiresManualApproval &&
    canReachChain &&
    !executing &&
    !execution?.transaction;

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-ink-50">
              {opportunity.name}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-mute-2">
              {opportunity.protocol} · {opportunity.tokenSymbol}
            </p>
          </div>
          <Pill tone="neutral">Seeded fixture</Pill>
        </div>

        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-mute-1">
          {opportunity.description}
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-ink-800 pt-4">
          <div>
            <label
              htmlFor="amount"
              className="block font-mono text-[10px] uppercase tracking-[0.12em] text-mute-2"
            >
              Amount
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^\d.]/g, ""));
                  invalidate();
                }}
                className="w-32 rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 font-mono text-sm text-ink-100"
              />
              <span className="font-mono text-xs text-mute-2">
                {opportunity.tokenSymbol}
              </span>
            </div>
          </div>

          {/*
            Three buttons in the order the pipeline runs, named for what each
            one actually does. "Execute" on its own would have implied the
            button decides; "Execute approved action" says out loud that the
            approval happened elsewhere and this only carries it out.
          */}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={assess} busy={assessing}>
              Ask SERV
            </Button>
            <Button onClick={evaluate} busy={evaluating}>
              Check my rules
            </Button>
            <Button
              tone="approve"
              onClick={execute}
              busy={executing}
              disabled={!canExecute}
            >
              Send the approved move
            </Button>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-mute-2">
SERV&rsquo;s opinion never becomes permission — that separation is what
          makes it safe to point a reasoning model at a live wallet. Only the
          rules check can approve, and sending stays locked until it does.
        </p>

        {/* A missing destination is a deployment setting, not a refusal and
            not a fault. Named as such, with the variable to set. */}
        {!canReachChain ? (
          <p className="mt-2 rounded border border-ink-600 bg-ink-850/70 px-3 py-2 text-[11px] leading-relaxed text-mute-1">
            <span aria-hidden="true">· </span>
            Execution is not configured on this deployment —{" "}
            <span className="font-mono text-ink-200">
              OPPORTUNITY_DEPOSIT_ADDRESS
            </span>{" "}
            is unset, and the server refuses to invent a destination for a
            transfer. Assessment and policy verification work normally.
          </p>
        ) : null}

        {evaluation?.verdict.requiresManualApproval ? (
          <p className="mt-2 rounded border border-warn-500/30 bg-warn-950/25 px-3 py-2 text-[11px] leading-relaxed text-warn-400">
            <span aria-hidden="true">! </span>
            You asked to confirm every move yourself, so Execute stays locked
            until you turn that off in your rules. Working as intended.
          </p>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <DecisionFlow stage={stage} />
        </div>
        {/* What is happening right now, named. A spinner says "wait"; this
            says which of six round trips you are waiting on. */}
        {STAGE_LABEL[stage] ? (
          <p
            aria-live="polite"
            className="mt-4 border-t border-ink-800 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-info-500"
          >
            {STAGE_LABEL[stage]}
          </p>
        ) : null}
      </Card>

      {/* A failed request is amber and says so. Red is reserved for refusals. */}
      {evaluateError ? <ErrorNote message={evaluateError} onRetry={evaluate} /> : null}

      <ServVsPolicy
        assessment={assessment}
        assessmentError={assessmentError}
        assessing={assessing}
        verdict={evaluation?.verdict ?? null}
        evaluating={evaluating}
        policy={policy.data?.policy ?? null}
      />

      {/* ── Execution ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {executing || execution || executeError ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionHeader title="Execution" />
            <Card className="p-4 sm:p-5">
              {executing ? (
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 animate-spin rounded-full border border-warn-500 border-t-transparent"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-warn-400">
                    Submitting transaction…
                  </p>
                </div>
              ) : executeError ? (
                <>
                  <p className="text-sm font-medium text-warn-400">
                    <span aria-hidden="true">! </span>Execution did not complete
                  </p>
                  <p className="mt-1 break-words font-mono text-xs text-ink-300">
                    {executeError}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-mute-1">
                    This is a system error, not a policy decision. Nothing is
                    ever reported as confirmed without a transaction hash from
                    the chain.
                  </p>
                </>
              ) : execution?.transaction ? (
                <>
                  <p className="text-sm font-medium text-approve-400">
                    <span aria-hidden="true">✓ </span>Transaction confirmed
                  </p>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Amount">
                      <Mono className="text-ink-100">
                        {formatAtomic(
                          execution.action.amountAtomic,
                          opportunity.tokenDecimals,
                        )}{" "}
                        {opportunity.tokenSymbol}
                      </Mono>
                    </Field>
                    <Field label="Block">
                      <Mono className="text-ink-100">
                        {execution.transaction.block}
                      </Mono>
                    </Field>
                    <Field label="Gas used">
                      <Mono className="text-ink-100">
                        {execution.transaction.gasUsed}
                      </Mono>
                    </Field>
                    <Field label="Network">
                      <Mono className="text-ink-100">Base Sepolia</Mono>
                    </Field>
                  </dl>

                  <div className="mt-4 border-t border-ink-800 pt-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-mute-2">
                      Transaction hash
                    </p>
                    <Mono className="mt-1 block break-all text-xs text-ink-200">
                      {execution.transaction.hash}
                    </Mono>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton
                        value={execution.transaction.hash}
                        label="Copy hash"
                      />
                      <a
                        href={execution.transaction.explorer}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded border border-info-500/40 px-2.5 py-1 font-mono text-[11px] text-info-500 hover:border-info-500"
                      >
                        View on BaseScan ↗
                      </a>
                    </div>
                  </div>
                </>
              ) : execution ? (
                execution.requiresManualApproval ? (
                  <p className="text-sm leading-relaxed text-warn-400">
                    <span aria-hidden="true">! </span>
                    Your rules allow this, but you asked to confirm every move
                    yourself. Nothing was sent.
                  </p>
                ) : (
                  /* The server refused at the execution boundary too. Same
                     framing as any other refusal: a decision, not a fault. */
                  <SafetyDecision
                    headline={
                      execution.reason ??
                      "Your rules refused this. Nothing was sent."
                    }
                  />
                )
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
