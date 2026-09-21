/**
 * The landing page.
 *
 * LAYOUT
 *
 * The backdrop is full-bleed and the measure is not. A line of text 1900px
 * wide is unreadable, so the content stays inside a column — but an earlier
 * version let that column sit alone on a black field, which read as a narrow
 * document rather than a page. A fixed grid and one soft glow now fill the
 * viewport behind it, so the screen is occupied while the reading line stays
 * sane.
 *
 * Alignment alternates on purpose. The hero is centred, because it is a
 * statement. Everything under it is a two-column editorial layout — a small
 * mono label in the left channel, prose in the right — which gives the eye a
 * second axis to follow and stops nine consecutive left-aligned sections
 * reading as one long wall.
 *
 * A server component apart from three islands: the gate flow and the scroll
 * reveals. Everything else is static markup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { GateFlow } from "../components/landing/GateFlow";
import { ScrollReveal } from "../components/landing/ScrollReveal";
import { BrandMark } from "../components/shell/Brand";
import { SiteShell } from "../components/shell/SiteShell";

export const metadata: Metadata = {
  title: "VaultOS — Autonomous finance, with boundaries",
  description:
    "A control layer for autonomous wallets. An AI assesses an action; your " +
    "policy decides whether it may happen. Running on Base Sepolia testnet.",
};

const LAYERS = [
  {
    name: "SERV",
    role: "Advisory",
    authoritative: false,
    body: "Reads an action and gives an assessment — risk, liquidity, a suggested size, what concerns it. It has no route to the wallet and no way to authorise anything.",
  },
  {
    name: "Policy engine",
    role: "Authorization",
    authoritative: true,
    body: "Checks the proposed action against the limits you set. Deterministic, and it has never read a word the assessment said. This is the only layer that can say yes.",
  },
  {
    name: "AgentKit",
    role: "Execution",
    authoritative: false,
    body: "Signs and submits what was authorised, on Base Sepolia. It carries out a decision; it does not make one.",
  },
];

const CAPABILITIES = [
  [
    "Set the boundaries",
    "Twelve rules — size, risk, liquidity, leverage, total exposure, rate limits, which protocols are allowed.",
  ],
  [
    "Put an action through the pipeline",
    "Six proposed actions, each written to make a different rule fire. Watch every stage answer.",
  ],
  [
    "See exactly why something was refused",
    "Every refusal names the rule that produced it — in plain language, and in the code the engine emitted.",
  ],
  [
    "Execute what was approved",
    "A real transaction on Base Sepolia, reported only once a block confirms it.",
  ],
  [
    "Inspect the audit trail",
    "Append-only. What was assessed, what was decided, and which rule decided it.",
  ],
] as const;

const STACK = [
  [
    "SERV Reasoning",
    "Structured assessment, schema-validated and discarded if malformed",
  ],
  ["Coinbase AgentKit", "Wallet custody and on-chain execution"],
  ["Base Sepolia", "Test network — real transactions, no real money"],
  ["Supabase", "Audit persistence"],
] as const;

/** A section with its label in the left channel and its prose in the right. */
function Section({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-ink-800/80 py-16 sm:py-20"
    >
      <div className="grid gap-6 lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2 lg:pt-1.5">
          {label}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <SiteShell>
      <div className="relative isolate">
        <div className="landing-glow" aria-hidden="true" />
        <div className="landing-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* ── Hero, centred ──────────────────────────────────── */}
          <section className="mx-auto max-w-3xl py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-warn-500/30 bg-warn-950/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warn-400">
              Base Sepolia · testnet · no real money
            </span>

            <div className="mt-8 flex items-center justify-center gap-3">
              <BrandMark size={44} />
              <span className="text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
                Vault<span className="text-approve-400">OS</span>
              </span>
            </div>

            <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-approve-400">
              Autonomous finance, with boundaries
            </p>

            <h1 className="mx-auto mt-9 max-w-2xl text-3xl leading-[1.15] tracking-tight text-ink-50 sm:text-5xl">
              Let an AI assess an action.
              <span className="block text-mute-1">
                Your rules decide whether it happens.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-mute-1">
              VaultOS is a control layer for autonomous wallets. It lets a model
              analyse an action without giving that model any authority over the
              limits protecting the wallet.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-5 py-3 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/80"
              >
                Enter VaultOS
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded border border-ink-600 px-5 py-3 text-sm text-ink-200 transition-colors hover:border-ink-400 hover:bg-ink-850"
              >
                See how it works
              </Link>
            </div>
          </section>

          {/* ── The problem ────────────────────────────────────── */}
          <ScrollReveal>
            <Section label="The problem">
              <p className="max-w-2xl text-xl leading-relaxed text-ink-100 sm:text-2xl">
                Autonomous agents can already reason and act. The harder
                question is what they should be allowed to do.
              </p>
              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-mute-1">
                Give an agent a wallet and the failure mode is not that it
                reasons badly — it is that a confident, well-argued proposal
                outside your limits is indistinguishable from a good one. Asking
                a model to respect a limit does not create a limit. It creates a
                request, competing with everything else in the context.
              </p>
            </Section>
          </ScrollReveal>

          {/* ── The approach ───────────────────────────────────── */}
          <ScrollReveal>
            <Section label="The approach">
              <p className="max-w-2xl text-xl leading-relaxed text-ink-100 sm:text-2xl">
                VaultOS separates reasoning from authorization.
              </p>
              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-mute-1">
                You define the boundaries. SERV assesses the action. Your policy
                determines whether it is authorised. AgentKit executes what was
                approved. VaultOS records what happened. Each is a different
                piece of code, and the one that decides cannot be reached by the
                one that reasons.
              </p>
            </Section>
          </ScrollReveal>

          {/* ── The gate flow ──────────────────────────────────── */}
          <ScrollReveal>
            <Section label="How it works" id="how-it-works">
              <p className="mb-10 max-w-2xl text-xl leading-relaxed text-ink-100 sm:text-2xl">
                Seven gates. An action has to pass every one of them, in order.
              </p>
              <GateFlow />
            </Section>
          </ScrollReveal>

          {/* ── The separation ─────────────────────────────────── */}
          <ScrollReveal>
            <Section label="Why it is split">
              <p className="mb-8 max-w-2xl text-xl leading-relaxed text-ink-100 sm:text-2xl">
                Three layers, three jobs. Only one of them can authorise
                anything.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                {LAYERS.map((l) => (
                  <div
                    key={l.name}
                    className={
                      l.authoritative
                        ? "rounded-lg border border-approve-500/35 bg-approve-950/20 p-4"
                        : "rounded-lg border border-ink-700 bg-ink-900/60 p-4"
                    }
                  >
                    <h3 className="text-sm font-medium text-ink-50">
                      {l.name}
                    </h3>
                    <p
                      className={
                        l.authoritative
                          ? "mt-1.5 inline-block rounded border border-approve-500/40 bg-approve-950/60 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-approve-400"
                          : "mt-1.5 inline-block rounded border border-ink-600 bg-ink-850 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-mute-1"
                      }
                    >
                      {l.role}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-mute-1">
                      {l.body}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          </ScrollReveal>

          {/* ── What you can do ────────────────────────────────── */}
          <ScrollReveal>
            <Section label="What you can do">
              <ul className="grid list-none gap-x-10 gap-y-6 md:grid-cols-2">
                {CAPABILITIES.map(([title, body]) => (
                  <li key={title} className="border-l border-ink-700 pl-4">
                    <h3 className="text-sm font-medium text-ink-100">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mute-1">
                      {body}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </ScrollReveal>

          {/* ── What is running today ──────────────────────────── */}
          <ScrollReveal>
            <Section label="Running today">
              <p className="max-w-2xl text-[15px] leading-relaxed text-ink-200">
                VaultOS demonstrates this workflow on Base Sepolia. The wallet,
                the balances, the transfers and the confirmations are real and
                verifiable on a block explorer. The six actions are synthetic
                examples, each written to exercise a different rule — three
                pass, three are refused.
              </p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute-1">
                Testnet funds have no monetary value. Nothing here earns a
                return, and VaultOS is not an investment service.
              </p>

              <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STACK.map(([name, note]) => (
                  <div
                    key={name}
                    className="rounded-lg border border-ink-700 bg-ink-900/60 p-4"
                  >
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-100">
                      {name}
                    </dt>
                    <dd className="mt-1.5 text-[12px] leading-relaxed text-mute-1">
                      {note}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          </ScrollReveal>

          {/* ── Final CTA, centred to close the way it opened ──── */}
          <ScrollReveal>
            <section className="border-t border-ink-800/80 py-20 text-center sm:py-28">
              <p className="mx-auto max-w-2xl text-3xl leading-snug tracking-tight text-ink-50 sm:text-4xl">
                Put boundaries around autonomous action.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-5 py-3 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/80"
                >
                  Enter VaultOS
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/about"
                  className="text-sm text-mute-1 underline-offset-4 hover:text-ink-100 hover:underline"
                >
                  Read more about the design
                </Link>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </SiteShell>
  );
}
