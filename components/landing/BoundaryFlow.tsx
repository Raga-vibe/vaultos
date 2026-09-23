"use client";

/**
 * The boundary, animated.
 *
 * WHAT IT SHOWS
 *
 * Two moves, one after the other, on a loop.
 *
 *   1. A modest move. SERV looks at it, your rules pass it, AgentKit sends it,
 *      and it is confirmed in a block.
 *   2. A greedy move. SERV looks at it, your rules refuse it — and the dot
 *      stops there. AgentKit and the chain are never reached.
 *
 * That second run is the product. Everything else on the landing page argues
 * that the AI's opinion cannot become permission; this is the one place a
 * visitor watches it not happen.
 *
 * The two example moves are the real ones from the workspace — Stablecoin
 * reserve and Volatile asset strategy — so the story told here is the story a
 * judge will reproduce when they click through.
 *
 * MOTION RULES
 *
 * Transform and opacity only. The dot rides a rail by translating a
 * full-width wrapper, and the filled part of the rail is a scaleX. Nothing
 * animates width, left or colour on a large surface.
 *
 * It only runs while on screen, so it costs nothing below the fold.
 *
 * Under prefers-reduced-motion it does not animate at all. It renders the
 * four stages and states both outcomes in words instead. Not a slower
 * animation — none.
 *
 * The looping caption is hidden from screen readers, which would otherwise
 * announce it every two seconds forever. A static description stands in.
 */

import clsx from "clsx";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Stage = 0 | 1 | 2 | 3;
type Step = {
  run: "approve" | "refuse";
  at: Stage;
  rules?: "pass" | "fail";
  confirmed?: boolean;
  halted?: boolean;
  caption: string;
  ms: number;
};

const NODES = [
  {
    name: "SERV",
    role: "Suggests",
    line: "Reads the move and gives an opinion.",
  },
  {
    name: "Your rules",
    role: "Decides",
    line: "Checks every limit. Never sees what SERV said.",
  },
  {
    name: "AgentKit",
    role: "Sends",
    line: "Signs only what your rules approved.",
  },
  {
    name: "Base Sepolia",
    role: "Confirms",
    line: "A real transaction, in a block.",
  },
] as const;

const STEPS: Step[] = [
  {
    run: "approve",
    at: 0,
    caption: "A move comes in — Stablecoin reserve, low risk.",
    ms: 1900,
  },
  {
    run: "approve",
    at: 1,
    rules: "pass",
    caption: "Your rules check it. Every limit passes.",
    ms: 1700,
  },
  {
    run: "approve",
    at: 2,
    rules: "pass",
    caption: "AgentKit sends it.",
    ms: 1400,
  },
  {
    run: "approve",
    at: 3,
    rules: "pass",
    confirmed: true,
    caption: "Confirmed in a block.",
    ms: 2400,
  },
  {
    run: "refuse",
    at: 0,
    caption: "Another move — Volatile strategy, promising 24.5%.",
    ms: 2300,
  },
  {
    run: "refuse",
    at: 1,
    rules: "fail",
    caption: "Your rules say no. The risk is above your limit.",
    ms: 1900,
  },
  {
    run: "refuse",
    at: 1,
    rules: "fail",
    halted: true,
    caption: "Nothing is sent. Whatever SERV thought, it was never permission.",
    ms: 3200,
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** A small status badge on a stage card. */
function Badge({
  tone,
  children,
}: {
  tone: "approve" | "reject" | "muted";
  children: React.ReactNode;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        tone === "approve" &&
          "border-approve-500/40 bg-approve-950/60 text-approve-400",
        tone === "reject" &&
          "border-reject-500/50 bg-reject-950/60 text-reject-400",
        tone === "muted" && "border-ink-700 text-mute-3",
      )}
    >
      {children}
    </motion.span>
  );
}

export function BoundaryFlow() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { margin: "-10% 0px -10% 0px" });
  const [i, setI] = useState(0);

  const animating = !reduce && inView;

  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), STEPS[i].ms);
    return () => clearTimeout(t);
  }, [i, animating]);

  const step = STEPS[i];
  const refusing = step.run === "refuse";

  return (
    <div ref={root}>
      {/* What a screen reader hears, once, instead of a looping caption. */}
      <p className="sr-only">
        Every move passes four stages: SERV suggests, your rules decide,
        AgentKit sends, and Base Sepolia confirms. When your rules refuse a
        move, it stops there and nothing is sent.
      </p>

      {/* ── The rail, desktop and tablet ─────────────────────────── */}
      {!reduce ? (
        <div className="relative mb-4 hidden h-6 md:block" aria-hidden="true">
          {/* Track */}
          <div className="absolute left-[12.5%] right-[12.5%] top-1/2 h-px -translate-y-1/2 bg-ink-700" />
          {/* Travelled part of the track */}
          <motion.div
            className={clsx(
              "absolute left-[12.5%] top-1/2 h-px w-[75%] origin-left -translate-y-1/2",
              refusing && step.rules === "fail" ? "bg-reject-500" : "bg-approve-500",
            )}
            initial={false}
            animate={{ scaleX: step.at / 3 }}
            transition={{ duration: step.at === 0 ? 0 : 0.7, ease: EASE }}
          />
          {/* Stops */}
          {[12.5, 37.5, 62.5, 87.5].map((left, n) => (
            <span
              key={left}
              className={clsx(
                "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-300",
                n <= step.at
                  ? refusing && n === 1 && step.rules === "fail"
                    ? "border-reject-500 bg-reject-500"
                    : "border-approve-500 bg-approve-500"
                  : step.halted && n > 1
                    ? "border-ink-700 bg-ink-950"
                    : "border-ink-600 bg-ink-900",
              )}
              style={{ left: `${left}%` }}
            />
          ))}
          {/* The move itself. Remounted per run so it jumps back to the start
              instead of sliding backwards across the rail. */}
          <motion.div
            key={step.run}
            className="absolute inset-0"
            initial={{ x: "0%", opacity: 0 }}
            animate={{ x: `${step.at * 25}%`, opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span
              className={clsx(
                "absolute left-[12.5%] top-1/2 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4",
                refusing && step.rules === "fail"
                  ? "bg-reject-400 ring-reject-500/25"
                  : "bg-approve-400 ring-approve-500/25",
              )}
            />
          </motion.div>
        </div>
      ) : null}

      {/* ── The four stages ─────────────────────────────────────── */}
      <ol className="grid gap-3 md:grid-cols-4">
        {NODES.map((node, n) => {
          const isRules = n === 1;
          const here = !reduce && step.at === n;
          const unreached = !reduce && step.halted && n > 1;

          return (
            <li
              key={node.name}
              className={clsx(
                "relative rounded-lg border p-4 transition-opacity duration-500",
                isRules
                  ? "border-approve-500/40 bg-approve-950/20"
                  : "border-ink-700 bg-ink-900/60",
                unreached && "opacity-35",
              )}
            >
              {/* Highlight when the move is here. An overlay fading in, so
                  the card itself never repaints its border. */}
              <motion.span
                aria-hidden="true"
                className={clsx(
                  "pointer-events-none absolute inset-0 rounded-lg ring-1",
                  refusing && isRules && step.rules === "fail"
                    ? "ring-reject-500/70"
                    : "ring-approve-500/60",
                )}
                initial={false}
                animate={{ opacity: here ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] text-mute-3">
                    {String(n + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-ink-50">
                    {node.name}
                  </p>
                </div>
                <span
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                    isRules
                      ? "border-approve-500/40 text-approve-400"
                      : "border-ink-700 text-mute-2",
                  )}
                >
                  {node.role}
                </span>
              </div>

              <p className="mt-2 text-[13px] leading-relaxed text-mute-1">
                {node.line}
              </p>

              {/* Outcome, only in the animated version. */}
              <div className="mt-3 h-5">
                {isRules && step.rules === "pass" ? (
                  <Badge tone="approve">✓ Passed</Badge>
                ) : null}
                {isRules && step.rules === "fail" ? (
                  <Badge tone="reject">✕ Refused</Badge>
                ) : null}
                {n === 3 && step.confirmed ? (
                  <Badge tone="approve">✓ Confirmed</Badge>
                ) : null}
                {unreached ? <Badge tone="muted">Not reached</Badge> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── What is happening, in words ─────────────────────────── */}
      {!reduce ? (
        <div
          className="mt-5 flex min-h-[28px] items-center justify-center gap-2 text-center"
          aria-hidden="true"
        >
          <span
            className={clsx(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              refusing && step.rules === "fail" ? "bg-reject-400" : "bg-approve-400",
            )}
          />
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="text-[14px] text-ink-200"
          >
            {step.caption}
          </motion.p>
        </div>
      ) : (
        <ul className="mx-auto mt-5 w-fit space-y-2 text-[14px] text-ink-200">
          <li>
            <span className="text-approve-400">✓ Approved:</span> your rules
            pass it, AgentKit sends it, and it is confirmed in a block.
          </li>
          <li>
            <span className="text-reject-400">✕ Refused:</span> your rules say
            no, and it stops there. Nothing is sent.
          </li>
        </ul>
      )}
    </div>
  );
}
