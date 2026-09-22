/**
 * The landing page.
 *
 * THREE BEATS, NOT SEVEN
 *
 * An earlier version ran seven sections — the problem, seven numbered checks,
 * three cards, five capabilities, a stack list, a proof strip, a closing line.
 * Every one of them was true and most of them were said twice. A judge has
 * perhaps ten seconds before deciding whether to keep reading, and seven
 * sections is a document, not a product page.
 *
 * So the page now makes one claim and backs it:
 *
 *   1. The claim. A spending limit for AI that can move your money.
 *   2. The mechanism, animated. One move is approved and sent; the next is
 *      refused at your rules and never reaches the wallet. That second run is
 *      the whole idea, shown rather than described.
 *   3. The evidence. The live audit trail and a real transaction on a block
 *      explorer VaultOS does not control.
 *
 * Then one button. The longer explanation still exists, at /about, for anyone
 * who wants it — it is just no longer standing between a visitor and the
 * product.
 *
 * LAYOUT
 *
 * The backdrop is full-bleed and the measure is not. A line of text 1900px
 * wide is unreadable, so the content sits inside one column, while a fixed
 * grid and a soft glow fill the viewport behind it.
 *
 * A server component apart from the islands: the flow, the proof strip and
 * the scroll reveals.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BoundaryFlow } from "../components/landing/BoundaryFlow";
import { LiveProof } from "../components/landing/LiveProof";
import { ScrollReveal } from "../components/landing/ScrollReveal";
import { SiteShell } from "../components/shell/SiteShell";

export const metadata: Metadata = {
  title: "VaultOS — Autonomous finance, with boundaries",
  description:
    "A spending limit for AI that can move your money. SERV suggests, your " +
    "rules decide, AgentKit sends only what they allow. Running on Base " +
    "Sepolia testnet.",
};

const PRIMARY =
  "inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-5 py-3 text-sm font-medium text-approve-400 transition-[background-color,border-color,transform] hover:border-approve-500 hover:bg-approve-950/80 active:scale-[0.98]";
const SECONDARY =
  "inline-flex items-center gap-2 rounded border border-ink-600 px-5 py-3 text-sm text-ink-200 transition-[background-color,border-color,transform] hover:border-ink-400 hover:bg-ink-850 active:scale-[0.98]";

export default function Landing() {
  return (
    <SiteShell>
      <div className="relative isolate">
        <div className="landing-glow" aria-hidden="true" />
        <div className="landing-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
          {/* ── 1. The claim ─────────────────────────────────────── */}
          <section className="mx-auto max-w-3xl pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-warn-500/30 bg-warn-950/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warn-400">
                <span aria-hidden="true">!</span>
                Base Sepolia · testnet · no real money
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.06}>
              <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.22em] text-approve-400">
                Autonomous finance, with boundaries
              </p>
              <h1 className="mx-auto mt-4 max-w-3xl text-balance text-[34px] font-semibold leading-[1.1] tracking-tight text-ink-50 sm:text-[48px]">
                A spending limit for AI
                <span className="block text-mute-1">
                  that can move your money.
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-mute-1">
                SERV suggests. Your rules decide. AgentKit sends only what they
                allow — however good the argument.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/app" className={PRIMARY}>
                  Enter VaultOS
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="#how-it-works" className={SECONDARY}>
                  See it work
                </Link>
              </div>
            </ScrollReveal>
          </section>

          {/* ── 2. The mechanism ─────────────────────────────────── */}
          <section
            id="how-it-works"
            className="scroll-mt-20 border-t border-ink-800/80 py-14 sm:py-20"
          >
            <ScrollReveal>
              <div className="mb-10 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute-2">
                  How it works
                </p>
                <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-ink-50 sm:text-3xl">
                  The AI can argue for anything.
                  <span className="block text-mute-1">
                    It can&rsquo;t approve anything.
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mute-1">
                  Every move passes four stages. Only one of them can say yes —
                  and it never sees what the AI said.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <BoundaryFlow />
            </ScrollReveal>

            {/* ── 3. The evidence ────────────────────────────────── */}
            <ScrollReveal delay={0.08}>
              <div className="mt-12">
                <LiveProof />
              </div>
            </ScrollReveal>
          </section>

          {/* ── Close ────────────────────────────────────────────── */}
          <section className="border-t border-ink-800/80 py-16 text-center sm:py-20">
            <ScrollReveal>
              <p className="mx-auto max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-ink-50 sm:text-3xl">
                Put boundaries around autonomous action.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-mute-1">
                Built as a policy layer between reasoning and execution. Any
                agent can ask the rules check before it acts.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/app" className={PRIMARY}>
                  Enter VaultOS
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/about"
                  className="text-sm text-mute-1 underline-offset-4 transition-colors hover:text-ink-100 hover:underline"
                >
                  How it&rsquo;s built
                </Link>
              </div>
            </ScrollReveal>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
