"use client";

/**
 * The explainer.
 *
 * Someone who has never heard of a policy engine should understand this
 * product before they scroll. That is the only job this component has.
 *
 * It resists two temptations. It does not become a marketing page — the real
 * product is a few hundred pixels below and must stay reachable. And it does
 * not simplify into vagueness: the three panels say exactly what the three
 * layers do, in the order they happen, because the separation between them is
 * the whole idea rather than a detail to smooth over.
 */

import { motion, useReducedMotion } from "motion/react";
import { Card } from "../ui/primitives";

const STEPS = [
  {
    n: "1",
    label: "You set the boundaries",
    body: "How much it may spend. How risky it may get. Whether it may borrow. Whether it may act without asking you.",
    tone: "approve" as const,
  },
  {
    n: "2",
    label: "SERV gives an opinion",
    body: "The AI reads an opportunity and says what it thinks — the risks, a suggested amount, what worries it. Advisory. That is all it does.",
    tone: "neutral" as const,
  },
  {
    n: "3",
    label: "Your rules decide",
    body: "Separate code checks the request against your boundaries. It never reads SERV's opinion. If a rule says no, nothing moves — and that refusal is the system working.",
    tone: "info" as const,
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="sr-only">
        How VaultOS works
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.08 * i,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Card className="h-full p-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={
                    step.tone === "approve"
                      ? "flex h-6 w-6 items-center justify-center rounded-full border border-approve-500/50 bg-approve-950 font-mono text-[11px] text-approve-400"
                      : step.tone === "info"
                        ? "flex h-6 w-6 items-center justify-center rounded-full border border-info-500/50 bg-info-950 font-mono text-[11px] text-info-500"
                        : "flex h-6 w-6 items-center justify-center rounded-full border border-ink-600 bg-ink-850 font-mono text-[11px] text-ink-300"
                  }
                  aria-hidden="true"
                >
                  {step.n}
                </span>
                <h3 className="text-sm font-medium text-ink-50">{step.label}</h3>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-mute-1">
                {step.body}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-3 rounded-lg border border-ink-800 bg-ink-900/60 px-4 py-3 text-[13px] leading-relaxed text-ink-300">
        <span className="text-mute-2">In one sentence: </span>
        it is like handing someone a card with a spending limit already set.
        They can suggest whatever they like — the limit is not theirs to move.
      </p>
    </section>
  );
}
