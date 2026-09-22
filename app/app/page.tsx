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
 * The five steps sit in one row under the title — a map, not a tutorial.
 * The landing page carries the full story; this page only needs to remind.
 */

import Link from "next/link";
import { useState } from "react";
import { AgentStatus } from "../../components/agent/AgentStatus";
import { AuditTrail } from "../../components/audit/AuditTrail";
import { PolicyPanel } from "../../components/policy/PolicyPanel";
import { SystemStatusOnDemand } from "../../components/system/SystemStatus";
import { Reveal, SectionHeader } from "../../components/ui/primitives";
import { WalletCard } from "../../components/wallet/WalletCard";
import { api, useAsync } from "../../lib/ui/api";

const STEPS = [
  ["Set limits", "How much, how risky."],
  ["Pick a move", "Six test cases."],
  ["SERV suggests", "Approves nothing."],
  ["Rules decide", "Never see SERV's answer."],
  ["Send if allowed", "Confirmed in a block."],
] as const;

export default function Overview() {
  /*
    Three reads, fired together — not four.

    /api/health was the fourth, and it resolves the same CDP wallet that
    /api/wallet does: the slowest call in the product, paid twice in parallel
    on every load. AgentStatus now derives readiness from the wallet response,
    and System status fetches health for itself when someone opens it.
  */
  const wallet = useAsync(() => api.wallet(), []);
  const policy = useAsync(() => api.policy(), []);
  const audit = useAsync(() => api.audit(), []);
  const [systemOpen, setSystemOpen] = useState(false);

  return (
    <div className="space-y-9">
      {/* ── Start here ───────────────────────────────────────────── */}
      <Reveal>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-[28px]">
            Start here
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-200">
            VaultOS puts hard limits around what an AI can do with your money.
            SERV suggests; your rules decide.
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

          {/*
            The five steps, as one row.

            They used to be an open list five items tall, standing between
            the page title and the wallet. The landing page now tells this
            story with an animation, so here it only needs to be a map: one
            line, glanceable, numbered, with the one step that decides
            anything marked as such.
          */}
          <ol className="mt-6 grid gap-1.5 sm:grid-cols-5 sm:gap-2">
            {STEPS.map(([title, body], i) => (
              <li
                key={title}
                className={
                  i === 3
                    ? "rounded-lg border border-approve-500/35 bg-approve-950/20 px-3 py-2 sm:py-2.5"
                    : "rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2 sm:py-2.5"
                }
              >
                {/* One line each on a phone; the gloss joins it from sm up. */}
                <div className="flex items-baseline gap-2 sm:block">
                  <p className="font-mono text-[10px] text-mute-3">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="text-[13px] font-medium text-ink-100 sm:mt-0.5">
                    {title}
                  </p>
                </div>
                <p className="mt-0.5 hidden text-[11px] leading-snug text-mute-2 sm:block">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </header>
      </Reveal>

      {/* ── Wallet state ─────────────────────────────────────────── */}
      <Reveal delay={0.08}>
        <section>
          <SectionHeader
            title="Your wallet"
            subtitle="Read from the chain. Refreshed on every visit."
          />
          <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
            <WalletCard state={wallet} />
            <AgentStatus wallet={wallet} policy={policy.data?.policy ?? null} />
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
        <details
          className="group"
          onToggle={(e) => setSystemOpen(e.currentTarget.open)}
        >
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
            {systemOpen ? <SystemStatusOnDemand /> : null}
          </div>
        </details>
      </Reveal>
    </div>
  );
}
