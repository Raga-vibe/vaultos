"use client";

/**
 * The gate flow — VaultOS's one signature animation.
 *
 * Seven stages, each a gate the action must pass. It is scroll-driven rather
 * than autoplaying: the reader advances the process themselves, which is the
 * point being made. An autoplaying loop would say "watch the machine work";
 * scrolling says "nothing moves until something lets it through".
 *
 * The technique — a scroll-progress value mapped onto a sequence — is the one
 * ObsidianUI's Flow Scroll uses, driven by `motion`'s useScroll/useTransform.
 * The library's own component is an image gallery, so its markup is no use
 * here, but the interaction model is exactly right and `motion` is already a
 * dependency, so this costs no new bytes.
 *
 * WHAT THE MOTION IS ALLOWED TO SAY
 *
 * That an action is passing through controls. Nothing else. So: transform and
 * opacity only, no filters, no particles, no glow that outgrows a 1px border.
 * Every animated property is compositor-friendly, and the whole thing is inert
 * under prefers-reduced-motion, where it renders as a plain labelled list —
 * which loses the drama and none of the meaning.
 *
 * THE BRANCH IS THE PRODUCT
 *
 * Stage four is a fork, not a step. A refused action stops there and the
 * remaining gates stay dark for good. Animating straight through to a
 * confirmed transaction would show a pipeline that always pays out, which is
 * the opposite of what this product does.
 */

import clsx from "clsx";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";

type Stage = {
  key: string;
  label: string;
  role: string | null;
  body: string;
};

const STAGES: readonly Stage[] = [
  {
    key: "opportunity",
    label: "Something is proposed",
    role: null,
    body: "A move the agent wants to make. Nothing has happened yet.",
  },
  {
    key: "serv",
    label: "SERV assessment",
    role: "Suggestion",
    body: "The AI says what it thinks — how risky, how much.",
  },
  {
    key: "policy",
    label: "Your rules are checked",
    role: "Decides",
    body: "Separate code, which never sees what the AI said.",
  },
  {
    key: "decision",
    label: "Allowed or refused",
    role: null,
    body: "Only this step can say yes.",
  },
  {
    key: "execution",
    label: "The wallet acts",
    role: null,
    body: "Runs only what was allowed.",
  },
  {
    key: "transaction",
    label: "Transaction",
    role: null,
    body: "On Base Sepolia, confirmed by a block.",
  },
  {
    key: "audit",
    label: "Written down",
    role: null,
    body: "What was decided, and which rule decided it.",
  },
];

/** The stage index at which a refusal ends the run. */
const DECISION_INDEX = 3;

function Gate({
  stage,
  index,
  progress,
  reduce,
}: {
  stage: Stage;
  index: number;
  progress: MotionValue<number>;
  reduce: boolean | null;
}) {
  // Each gate owns a slice of the scroll. `lit` crosses 0 → 1 as the reader
  // reaches it and stays there; nothing un-lights on the way back down, so
  // scrolling up does not play the process in reverse.
  const start = index / (STAGES.length + 1);
  const end = (index + 1) / (STAGES.length + 1);

  const lit = useTransform(progress, [start, end], [0, 1], { clamp: true });
  const x = useTransform(lit, [0, 1], [-10, 0]);
  const railScaleY = useTransform(lit, [0, 1], [0, 1]);

  const isDecision = index === DECISION_INDEX;

  return (
    /*
      The text never fades.

      An earlier version dimmed each stage to 0.25 until you scrolled to it,
      which looked like progression and read like a contrast failure — body
      copy at quarter opacity on a near-black background is unreadable, and a
      reader who has not scrolled yet is exactly the reader who most needs to
      read it. The progression is carried entirely by the rail filling and a
      small horizontal settle, both of which are decoration over content that
      was always legible.
    */
    <motion.li
      style={reduce ? undefined : { x }}
      className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5"
    >
      {/* Rail + node */}
      <div className="relative flex w-6 shrink-0 flex-col items-center">
        <span
          className={clsx(
            "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px]",
            stage.role === "Decides"
              ? "border-approve-500/60 bg-approve-950 text-approve-400"
              : isDecision
                ? "border-info-500/60 bg-info-950 text-info-500"
                : "border-ink-600 bg-ink-850 text-mute-1",
          )}
        >
          {index + 1}
        </span>

        {index < STAGES.length - 1 ? (
          <span className="relative mt-1 w-px flex-1 bg-ink-800">
            <motion.span
              aria-hidden="true"
              style={reduce ? undefined : { scaleY: railScaleY }}
              className={clsx(
                "absolute inset-0 origin-top",
                index < DECISION_INDEX ? "bg-ink-500" : "bg-approve-500/45",
              )}
            />
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-100">
            {stage.label}
          </h3>
          {stage.role ? (
            <span
              className={clsx(
                "rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider",
                stage.role === "Decides"
                  ? "border-approve-500/40 bg-approve-950/60 text-approve-400"
                  : "border-ink-600 bg-ink-850 text-mute-1",
              )}
            >
              {stage.role}
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-mute-1">
          {stage.body}
        </p>

        {/* The fork. Stated in words, not implied by a colour. */}
        {isDecision ? (
          <div className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <div className="rounded border border-reject-500/30 bg-reject-950/25 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-reject-400">
                × Refused
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-200">
                Stops here. Nothing below this line runs.
              </p>
            </div>
            <div className="rounded border border-approve-500/30 bg-approve-950/25 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-approve-400">
                ✓ Allowed
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-200">
                Continues to execution.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </motion.li>
  );
}

export function GateFlow() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.4"],
  });

  return (
    <div ref={ref}>
      <ol className="list-none">
        {STAGES.map((stage, i) => (
          <Gate
            key={stage.key}
            stage={stage}
            index={i}
            progress={scrollYProgress}
            reduce={reduce}
          />
        ))}
      </ol>
    </div>
  );
}
