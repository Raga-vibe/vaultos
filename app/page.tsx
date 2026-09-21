/**
 * The landing page.
 *
 * A server component on purpose. Everything here is text and layout, and the
 * only interactive thing on the page is the gate flow, which is the one island
 * of client JavaScript. A marketing page that ships a megabyte of React to
 * render nine paragraphs is a bad advertisement for a product whose whole
 * pitch is restraint.
 *
 * The argument it makes, in order: agents can already act; the open question
 * is what they may do; VaultOS answers it by separating the thing that thinks
 * from the thing that authorises. Everything on this page serves that one
 * claim, and anything that did not has been left off.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { GateFlow } from "../components/landing/GateFlow";
import { BrandMark } from "../components/shell/Brand";
import { SiteShell } from "../components/shell/SiteShell";

export const metadata: Metadata = {
  title: "VaultOS — Autonomous finance, with boundaries",
  description:
    "A control layer for autonomous wallets. An AI assesses an action; your " +
    "policy decides whether it may happen. Running on Base Sepolia testnet.",
};

/** The three layers, and what each one is permitted to do. */
const LAYERS = [
  {
    name: "SERV",
    role: "Advisory",
    tone: "neutral" as const,
    body: "Reads an opportunity and gives an assessment — risk, liquidity, a suggested size, what concerns it. It has no route to the wallet and no way to authorise anything.",
  },
  {
    name: "Policy engine",
    role: "Authorization",
    tone: "approve" as const,
    body: "Checks the proposed action against the limits you set. Deterministic, and it has never read a word the assessment said. This is the only layer that can say yes.",
  },
  {
    name: "AgentKit",
    role: "Execution",
    tone: "neutral" as const,
    body: "Signs and submits what was authorised, on Base Sepolia. It carries out a decision; it does not make one.",
  },
];

const CAPABILITIES = [
  [
    "Review opportunities",
    "Put a proposed action through the full pipeline and watch each stage answer.",
  ],
  [
    "Define wallet boundaries",
    "Twelve rules — size, risk, liquidity, leverage, exposure, rate limits, protocols.",
  ],
  [
    "See why an action is refused",
    "Every refusal names the rule that produced it, in plain language and in code.",
  ],
  [
    "Execute approved actions",
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

export default function Landing() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="border-b border-ink-800 py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded border border-warn-500/30 bg-warn-950/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warn-400">
            Base Sepolia · testnet
          </span>

          <div className="mt-6 flex items-center gap-3">
            <BrandMark size={40} />
            <h1 className="text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
              Vault<span className="text-approve-400">OS</span>
            </h1>
          </div>

          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-approve-400">
            Autonomous finance, with boundaries
          </p>

          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-ink-100 sm:text-2xl">
            Let an AI assess an action. Your rules decide whether it can happen.
          </p>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute-1">
            VaultOS is a control layer for autonomous wallets. It lets a model
            analyse an action without giving that model any authority over the
            limits protecting the wallet.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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

        {/* ── The problem ──────────────────────────────────────────── */}
        <section className="border-b border-ink-800 py-14 sm:py-20">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            The problem
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-100 sm:text-xl">
            Autonomous agents can already reason and act. The harder question is
            what they should be allowed to do.
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-mute-1">
            Give an agent a wallet and the failure mode is not that it reasons
            badly — it is that a confident, well-argued proposal outside your
            limits is indistinguishable from a good one. Asking the model to
            respect a limit does not create a limit. It creates a request.
          </p>
        </section>

        {/* ── The approach ─────────────────────────────────────────── */}
        <section className="border-b border-ink-800 py-14 sm:py-20">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            The approach
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-100 sm:text-xl">
            VaultOS separates reasoning from authorization.
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-mute-1">
            You define the boundaries. SERV assesses the opportunity. Your
            policy determines whether the action is authorised. AgentKit
            executes what was approved. VaultOS records what happened. Each of
            those is a different piece of code, and the one that decides cannot
            be reached by the one that reasons.
          </p>
        </section>

        {/* ── The gate flow ────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-b border-ink-800 py-14 sm:py-20"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            How it works
          </h2>
          <p className="mt-4 mb-10 max-w-3xl text-lg leading-relaxed text-ink-100 sm:text-xl">
            Seven gates. An action has to pass every one of them, in order.
          </p>
          <GateFlow />
        </section>

        {/* ── Why the separation matters ───────────────────────────── */}
        <section className="border-b border-ink-800 py-14 sm:py-20">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            Why the separation matters
          </h2>
          <p className="mt-4 mb-8 max-w-3xl text-lg leading-relaxed text-ink-100 sm:text-xl">
            Three layers, three jobs. Only one of them can authorise anything.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {LAYERS.map((l) => (
              <div
                key={l.name}
                className={
                  l.tone === "approve"
                    ? "rounded-lg border border-approve-500/35 bg-approve-950/20 p-4"
                    : "rounded-lg border border-ink-700 bg-ink-900/60 p-4"
                }
              >
                <h3 className="text-sm font-medium text-ink-50">{l.name}</h3>
                <p
                  className={
                    l.tone === "approve"
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
        </section>

        {/* ── What you can do ──────────────────────────────────────── */}
        <section className="border-b border-ink-800 py-14 sm:py-20">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            What you can do
          </h2>
          <ul className="mt-6 grid list-none gap-x-8 gap-y-5 sm:grid-cols-2">
            {CAPABILITIES.map(([title, body]) => (
              <li key={title} className="border-l border-ink-700 pl-4">
                <h3 className="text-sm font-medium text-ink-100">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-mute-1">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Current demo ─────────────────────────────────────────── */}
        <section className="border-b border-ink-800 py-14 sm:py-20">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            What is running today
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-200">
            VaultOS demonstrates this workflow on Base Sepolia. The wallet, the
            balances and the transactions are real and verifiable on a block
            explorer. The opportunities are synthetic examples, written to
            exercise different rules — three of the six are refused, each by a
            different one.
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-mute-1">
            Testnet funds have no monetary value. Nothing here earns a return,
            and VaultOS is not an investment service.
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
        </section>

        {/* ── Final CTA ────────────────────────────────────────────── */}
        <section className="py-16 sm:py-24">
          <p className="max-w-2xl text-2xl leading-snug text-ink-50 sm:text-3xl">
            Put boundaries around autonomous action.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
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
      </div>
    </SiteShell>
  );
}
