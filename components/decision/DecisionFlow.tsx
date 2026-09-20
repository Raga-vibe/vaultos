"use client";

/**
 * The pipeline, as a stepper.
 *
 * Horizontal on desktop, vertical on mobile. The illumination follows the real
 * state of the request — a step is never lit because it looks better lit.
 * "Confirmed" in particular only illuminates when the backend has returned a
 * transaction hash and a block.
 */

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";

/** Where a request has reached. */
export type FlowStage =
  | "idle"
  | "assessing"
  | "evaluating"
  | "approved"
  | "rejected"
  | "awaiting"
  | "executing"
  | "confirmed"
  | "failed";

const STEPS = [
  { key: "opportunity", label: "Something to invest in" },
  { key: "serv", label: "AI gives its opinion" },
  { key: "policy", label: "Your rules are checked" },
  { key: "verdict", label: "Allowed or refused" },
  { key: "execution", label: "Money moves" },
  { key: "audit", label: "Written down forever" },
] as const;

/**
 * How far along the pipeline a stage sits.
 *
 * @param stage - The current stage.
 * @returns Index of the furthest reached step.
 */
function reached(stage: FlowStage): number {
  switch (stage) {
    case "idle":
      return 0;
    case "assessing":
      return 1;
    case "evaluating":
      return 2;
    case "approved":
    case "rejected":
    case "awaiting":
      return 3;
    case "executing":
      return 4;
    case "failed":
      return 4;
    case "confirmed":
      return 5;
  }
}

/** Tone for the verdict step, so a rejection reads red rather than green. */
function stepTone(index: number, stage: FlowStage): "done" | "active" | "reject" | "idle" {
  const at = reached(stage);
  if (stage === "rejected" && index === 3) return "reject";
  if (stage === "failed" && index === 4) return "reject";
  if (index < at) return "done";
  if (index === at) return stage === "idle" ? "idle" : "active";
  return "idle";
}

export function DecisionFlow({ stage }: { stage: FlowStage }) {
  const reduce = useReducedMotion();

  return (
    <ol
      className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0"
      aria-label="Decision pipeline"
    >
      {STEPS.map((step, i) => {
        const tone = stepTone(i, stage);
        const isLast = i === STEPS.length - 1;

        const dot =
          tone === "done"
            ? "border-approve-500 bg-approve-950 text-approve-400"
            : tone === "active"
              ? "border-info-500 bg-info-950 text-info-500"
              : tone === "reject"
                ? "border-reject-500 bg-reject-950 text-reject-400"
                : "border-ink-700 bg-ink-850 text-mute-2";

        const glyph =
          tone === "done" ? "✓" : tone === "reject" ? "×" : tone === "active" ? "•" : "";

        return (
          <li
            key={step.key}
            className="flex flex-1 flex-row items-start gap-3 sm:flex-col sm:items-center sm:gap-2"
          >
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              {/* Leading connector (desktop only, not on first) */}
              <span
                aria-hidden="true"
                className={clsx(
                  "hidden h-px flex-1 sm:block",
                  i === 0 ? "bg-transparent" : tone === "idle" ? "bg-ink-800" : "bg-ink-600",
                )}
              />

              <span
                className={clsx(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                  dot,
                )}
              >
                {tone === "active" && !reduce ? (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-info-500"
                    animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.7, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative">{glyph}</span>
              </span>

              {/* Trailing connector */}
              <span
                aria-hidden="true"
                className={clsx(
                  "hidden h-px flex-1 sm:block",
                  isLast ? "bg-transparent" : i < reached(stage) ? "bg-ink-600" : "bg-ink-800",
                )}
              />

              {/* Mobile vertical connector */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "my-1 w-px flex-1 sm:hidden",
                    i < reached(stage) ? "bg-ink-600" : "bg-ink-800",
                  )}
                  style={{ minHeight: 18 }}
                />
              ) : null}
            </div>

            <span
              className={clsx(
                "pb-4 text-[11px] uppercase tracking-[0.1em] sm:pb-0 sm:text-center",
                tone === "idle" ? "text-mute-2" : "text-ink-200",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
