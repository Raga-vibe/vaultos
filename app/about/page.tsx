/**
 * About.
 *
 * Deliberately short. The temptation on a page like this is to empty the
 * README onto it; what a reader actually wants is the argument, the shape of
 * the answer, and an honest boundary around what the thing does not do. The
 * last section is the one most products leave out, which is exactly why it is
 * here.
 *
 * A server component — no interactivity, so no client bundle.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../../components/shell/SiteShell";

export const metadata: Metadata = {
  title: "About — VaultOS",
  description:
    "Why VaultOS separates reasoning from authorization, how SERV, the policy engine and AgentKit relate, and what the current demo does and does not claim.",
};

const LAYERS = [
  [
    "SERV",
    "Advisory",
    "Provides an assessment: risk, liquidity, a suggested allocation, and what concerns it. It cannot reach the policy engine and cannot authorise anything. If its answer is malformed, it is discarded rather than guessed at.",
  ],
  [
    "Policy engine",
    "Authorization",
    "Checks the proposed action against explicit, user-defined rules. Deterministic, exact-integer arithmetic, no clock of its own, and it fails closed — if a rule cannot be evaluated, the answer is no. It has never read the assessment.",
  ],
  [
    "AgentKit",
    "Execution",
    "Signs and submits the transaction, on Base Sepolia. It runs only what was authorised, and reports a result only when a block confirms it.",
  ],
  [
    "Audit trail",
    "Record",
    "Append-only. What was assessed, what was allowed, what was refused, what executed, and which rule produced each outcome.",
  ],
] as const;

const NOT = [
  "Not a profit guarantee, and not a claim that any of this earns a return.",
  "Not a production investment service. Base Sepolia only; there is no mainnet path in the code.",
  "Not an unrestricted trading bot. Nothing executes that your policy did not authorise.",
  "Not financial advice. The assessments are a language model's opinion, presented as one.",
] as const;

export default function About() {
  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          About VaultOS
        </h1>
        <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-approve-400">
          Autonomous finance, with boundaries
        </p>

        <p className="mt-7 text-lg leading-relaxed text-ink-100">
          VaultOS is a control layer for autonomous wallets. It lets an AI
          analyse an action without giving the AI authority to override the
          rules that protect the wallet.
        </p>

        {/* ── The problem ────────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            The problem
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
            Autonomous agents can reason and act. Giving one unrestricted
            authority creates a different problem: what happens when the agent
            proposes something outside the owner&rsquo;s limits?
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mute-1">
            The usual answer is to put the limit in the prompt. But a limit a
            model is asked to respect is not a limit — it is a request, and it
            competes with every other instruction in the context. The failure
            case is not a model that reasons badly. It is a model that reasons
            persuasively toward something you never agreed to.
          </p>
        </section>

        {/* ── The approach ───────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            The approach
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
            VaultOS separates reasoning from authorization, and keeps them in
            different code with no path between them.
          </p>

          <dl className="mt-6 space-y-4">
            {LAYERS.map(([name, role, body]) => (
              <div
                key={name}
                className={
                  role === "Authorization"
                    ? "rounded-lg border border-approve-500/35 bg-approve-950/20 p-4"
                    : "rounded-lg border border-ink-700 bg-ink-900/60 p-4"
                }
              >
                <dt className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink-50">
                    {name}
                  </span>
                  <span
                    className={
                      role === "Authorization"
                        ? "rounded border border-approve-500/40 bg-approve-950/60 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-approve-400"
                        : "rounded border border-ink-600 bg-ink-850 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-mute-1"
                    }
                  >
                    {role}
                  </span>
                </dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-mute-1">
                  {body}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 rounded-lg border border-ink-700 bg-ink-850/60 px-4 py-3 text-[13px] leading-relaxed text-ink-200">
            <span className="text-mute-2">The rule underneath all of it: </span>
            a language model never decides whether a hard financial constraint
            is satisfied.
          </p>
        </section>

        {/* ── Current demo ───────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            The current demo
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
            VaultOS runs this workflow on Base Sepolia using synthetic
            opportunities and real testnet transactions. The wallet, the
            balances, the transfers and the confirmations are genuine and
            verifiable on a block explorer.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-mute-1">
            The six opportunities are invented examples, each written to
            exercise a different rule — three pass, three are refused. Testnet
            funds have no monetary value and cannot be exchanged for anything.
          </p>
        </section>

        {/* ── What it is not ─────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute-2">
            What VaultOS is not
          </h2>
          <ul className="mt-4 list-none space-y-2.5">
            {NOT.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-[14px] leading-relaxed text-mute-1"
              >
                <span aria-hidden="true" className="text-reject-400">
                  ×
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14 border-t border-ink-800 pt-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-5 py-3 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/80"
          >
            Enter VaultOS
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
