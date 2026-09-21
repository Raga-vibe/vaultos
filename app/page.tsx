"use client";

/**
 * Overview — the command center.
 *
 * Not a landing page with the product underneath it. The first viewport has
 * to answer four questions at once: what is this, whose wallet is it, what is
 * it allowed to do, and what do I press. Everything below that is depth for
 * the person who wants it, not the price of entry for the person who doesn't.
 *
 * There is one primary action, and it is "Review an opportunity" — the single
 * path that demonstrates the claim the headline makes. "Configure policy" is
 * secondary and looks secondary, because changing the boundaries before you
 * have watched one enforced is the wrong order to meet this product in.
 */

import Link from "next/link";
import { AgentStatus } from "../components/agent/AgentStatus";
import { BrandMark } from "../components/shell/Brand";
import { HowItWorks } from "../components/explain/HowItWorks";
import { TestnetNotice } from "../components/explain/TestnetNotice";
import { AuditTrail } from "../components/audit/AuditTrail";
import { DecisionFlow } from "../components/decision/DecisionFlow";
import { PolicyPanel } from "../components/policy/PolicyPanel";
import { SystemStatus } from "../components/system/SystemStatus";
import { Card, Reveal, SectionHeader } from "../components/ui/primitives";
import { WalletCard } from "../components/wallet/WalletCard";
import { api, useAsync } from "../lib/ui/api";

export default function Overview() {
  const wallet = useAsync(() => api.wallet(), []);
  const health = useAsync(() => api.health(), []);
  const policy = useAsync(() => api.policy(), []);
  const audit = useAsync(() => api.audit(), []);

  return (
    <div className="space-y-10">
      {/* ── Command center ───────────────────────────────────────── */}
      <Reveal>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          {/* Identity, claim, actions */}
          <header>
            <div className="flex items-center gap-3">
              <BrandMark size={34} />
              <h1 className="text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
                Vault<span className="text-approve-400">OS</span>
              </h1>
            </div>
            <p className="mt-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-approve-400">
              Autonomous finance, with boundaries
            </p>

            {/*
              The claim, stated without overselling what the software does.
              An earlier draft said the agent "invests on its own", which
              promised an autonomy this product deliberately does not grant:
              autoExecute is off by default, and the point of the whole design
              is that the AI proposes and never disposes.
            */}
            <p className="mt-5 text-base leading-relaxed text-ink-200 sm:text-lg">
              The control layer for autonomous wallets. An AI proposes moves.
              Your rules decide whether any of them happen.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-mute-1">
              The AI advises. It never authorises. A separate piece of code
              checks every move against the boundaries you set, and that code
              has never read a word the AI wrote. If a rule says no, nothing
              moves — however confident the AI was.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-4 py-2.5 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/80"
              >
                Review an opportunity
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/policy"
                className="inline-flex items-center gap-2 rounded border border-ink-600 px-4 py-2.5 text-sm text-ink-200 transition-colors hover:border-ink-400 hover:bg-ink-850"
              >
                Configure policy
              </Link>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-mute-2">
              Six examples, checked live against your rules. Three are refused,
              each for a different reason — and a refusal is the system
              working, not failing.
            </p>
          </header>

          {/* Whose wallet, and is anything wrong with it */}
          <div className="space-y-4">
            <WalletCard state={wallet} />
            <AgentStatus health={health} policy={policy.data?.policy ?? null} />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <TestnetNotice />
      </Reveal>

      <Reveal delay={0.06}>
        <HowItWorks />
      </Reveal>

      {/* ── The pipeline ─────────────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section>
          <SectionHeader
            title="What happens on every move"
            subtitle="Six stages, always in this order. None of them can be skipped, and stage three is the only one that can say yes."
          />
          <Card className="overflow-x-auto p-5">
            <DecisionFlow stage="idle" />
          </Card>
        </section>
      </Reveal>

      {/* ── Policy ───────────────────────────────────────────────── */}
      <Reveal delay={0.14}>
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
            href="/policy"
            className="mt-3 inline-block font-mono text-[11px] uppercase tracking-wider text-mute-1 hover:text-ink-100"
          >
            All 12 rules, and how to change them →
          </Link>
        </section>
      </Reveal>

      {/* ── Recent activity ──────────────────────────────────────── */}
      <Reveal delay={0.18}>
        <section>
          <SectionHeader
            title="Recent activity"
            trailing={
              <Link
                href="/activity"
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

      {/* ── System ───────────────────────────────────────────────── */}
      <Reveal delay={0.22}>
        <section>
          <SectionHeader
            title="System"
            subtitle="What is configured and reachable right now. Reported from the server, never assumed."
          />
          <SystemStatus state={health} />
        </section>
      </Reveal>
    </div>
  );
}
