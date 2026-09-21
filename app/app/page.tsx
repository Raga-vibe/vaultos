"use client";

/**
 * Overview — the workspace home.
 *
 * Not a pitch. The landing page at / makes the argument; by the time someone
 * is here they have already agreed to look, so this page answers a narrower
 * question: what is my wallet, what am I currently allowing, and what do I do
 * next. The answer to the last one is a single button.
 *
 * Order is the design. Explanation, then the one action, then state, then
 * history — so the eye lands on "Review an opportunity" before it lands on
 * anything it has to interpret.
 *
 * The Start here block is a <details>, open by default. Someone meeting the
 * product needs the five steps; someone on their fourth visit does not, and
 * collapsing it is one click with no tutorial to dismiss and no state to
 * store. Native disclosure, so it works with a keyboard and costs no
 * JavaScript.
 */

import Link from "next/link";
import { AgentStatus } from "../../components/agent/AgentStatus";
import { AuditTrail } from "../../components/audit/AuditTrail";
import { HowItWorks } from "../../components/explain/HowItWorks";
import { PolicyPanel } from "../../components/policy/PolicyPanel";
import { SystemStatus } from "../../components/system/SystemStatus";
import { TestnetNotice } from "../../components/explain/TestnetNotice";
import { Reveal, SectionHeader } from "../../components/ui/primitives";
import { WalletCard } from "../../components/wallet/WalletCard";
import { api, useAsync } from "../../lib/ui/api";

const STEPS = [
  ["Set your limits", "Twelve rules covering size, risk, liquidity and pace."],
  [
    "Review an opportunity",
    "Pick one of six examples to put through the pipeline.",
  ],
  [
    "See what SERV recommends",
    "An assessment. Advisory only — it authorises nothing.",
  ],
  [
    "See what your policy allows",
    "A separate verdict, from code that never read the assessment.",
  ],
  [
    "Execute only when approved",
    "A real Base Sepolia transaction, confirmed by a block.",
  ],
] as const;

export default function Overview() {
  const wallet = useAsync(() => api.wallet(), []);
  const health = useAsync(() => api.health(), []);
  const policy = useAsync(() => api.policy(), []);
  const audit = useAsync(() => api.audit(), []);

  return (
    <div className="space-y-9">
      {/* ── Start here ───────────────────────────────────────────── */}
      <Reveal>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
            Start here
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-200">
            VaultOS puts explicit limits around autonomous actions. An AI
            assesses an action; your rules decide whether it can happen.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/app/opportunities"
              className="inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-4 py-2.5 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/80"
            >
              Review an opportunity
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/app/policy"
              className="inline-flex items-center gap-2 rounded border border-ink-600 px-4 py-2.5 text-sm text-ink-200 transition-colors hover:border-ink-400 hover:bg-ink-850"
            >
              Configure policy
            </Link>
          </div>

          <details open className="group mt-5 max-w-2xl">
            <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.14em] text-mute-1 transition-colors hover:text-ink-100">
              <span
                aria-hidden="true"
                className="inline-block transition-transform group-open:rotate-90"
              >
                ›
              </span>{" "}
              What happens when you do
            </summary>
            <ol className="mt-3 list-none space-y-2.5 border-l border-ink-700 pl-4">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-px font-mono text-[11px] text-mute-3">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-[13px] font-medium text-ink-100">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-mute-1">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </header>
      </Reveal>

      <Reveal delay={0.04}>
        <TestnetNotice />
      </Reveal>

      {/* ── Wallet state ─────────────────────────────────────────── */}
      <Reveal delay={0.08}>
        <section>
          <SectionHeader
            title="Your wallet"
            subtitle="Read from the chain on every load. Never cached, never assumed."
          />
          <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
            <WalletCard state={wallet} />
            <AgentStatus health={health} policy={policy.data?.policy ?? null} />
          </div>
        </section>
      </Reveal>

      {/* ── Policy summary ───────────────────────────────────────── */}
      <Reveal delay={0.12}>
        <section>
          <PolicyPanel
            compact
            policy={policy.data?.policy ?? null}
            isDefault={policy.data?.isDefault ?? false}
            loading={policy.loading}
            error={policy.error}
            onRetry={policy.reload}
          />
          <Link
            href="/app/policy"
            className="mt-3 inline-block font-mono text-[11px] uppercase tracking-wider text-mute-1 hover:text-ink-100"
          >
            All 12 rules, and how to change them →
          </Link>
        </section>
      </Reveal>

      {/* ── How it works ─────────────────────────────────────────── */}
      <Reveal delay={0.16}>
        <HowItWorks />
      </Reveal>

      {/* ── Recent activity ──────────────────────────────────────── */}
      <Reveal delay={0.2}>
        <section>
          <SectionHeader
            title="Recent activity"
            trailing={
              <Link
                href="/app/activity"
                className="font-mono text-[11px] uppercase tracking-wider text-mute-1 hover:text-ink-100"
              >
                Full audit trail →
              </Link>
            }
          />
          <AuditTrail
            events={audit.data?.events ?? null}
            loading={audit.loading}
            error={audit.error}
            onRetry={audit.reload}
            limit={5}
          />
        </section>
      </Reveal>

      {/* ── System, folded away ──────────────────────────────────── */}
      <Reveal delay={0.24}>
        <details className="group">
          <summary className="cursor-pointer list-none font-mono text-[11px] uppercase tracking-[0.14em] text-mute-2 transition-colors hover:text-ink-100">
            <span
              aria-hidden="true"
              className="inline-block transition-transform group-open:rotate-90"
            >
              ›
            </span>{" "}
            System status
          </summary>
          <div className="mt-3">
            <SystemStatus state={health} />
          </div>
        </details>
      </Reveal>
    </div>
  );
}
