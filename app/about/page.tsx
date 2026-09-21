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
    "Why the AI that suggests and the code that decides are kept apart, and what this demo does and does not claim.",
};

const LAYERS = [
  [
    "SERV",
    "Suggestion",
    "Says how risky a move looks and how much it would put in. It cannot reach your rules and cannot approve anything. If its answer is unreadable, it is thrown away rather than guessed at.",
  ],
  [
    "Policy engine",
    "Decides",
    "Checks the move against the limits you set. Same question, same answer, every time — and if a rule can't be checked, the answer is no. It never sees what the AI said.",
  ],
  [
    "AgentKit",
    "Execution",
    "Sends the transaction. Only what was approved, and only reported as done once a block confirms it.",
  ],
  [
    "Audit trail",
    "Record",
    "What was asked, what was allowed, what was refused, and which rule decided.",
  ],
] as const;

const NOT = [
  "Not a way to make money. Nothing here earns anything.",
  "Not a real investment service. Test network only — there is no real-money path in the code.",
  "Not a trading bot let loose. Nothing runs that your rules did not allow.",
  "Not financial advice. What the AI says is an opinion, shown as one.",
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
          VaultOS is a spending limit for an AI that can move your money. The
          AI can analyse whatever it likes; it cannot move the line you drew.
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
                  role === "Decides"
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
                      role === "Decides"
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
            an AI never gets to decide whether a hard money limit has been met.
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
