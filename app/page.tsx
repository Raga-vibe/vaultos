"use client";

/**
 * Overview.
 *
 * The first screen answers, in order: whose wallet, what it may do, and what
 * it has done. A judge should be able to read the argument off this page
 * without scrolling past a marketing hero to find the product.
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
      {/* ── Masthead ─────────────────────────────────────────────── */}
      <Reveal>
        <header className="max-w-3xl">
          <div className="flex items-center gap-3">
            <BrandMark size={34} />
            <h1 className="text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
              Vault<span className="text-approve-400">OS</span>
            </h1>
          </div>
          <p className="mt-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-approve-400">
            Autonomous finance, with boundaries
          </p>

          <p className="mt-5 text-base leading-relaxed text-ink-200 sm:text-lg">
            The control layer for autonomous wallets. It invests on its own —
            inside limits you set, and cannot be talked out of.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-mute-1">
            An AI advises. It never decides. A separate piece of code checks
            every move against your rules, and that code has never read a word
            the AI wrote. If a rule says no, nothing moves — no matter how
            confident the AI was.
          </p>

          {/*
            One call to action, and only one. A visitor with thirty seconds
            should be pointed at the single screen that proves the claim above
            rather than left to choose between four equal links.
          */}
          <Link
            href="/opportunities"
            className="mt-6 inline-flex items-center gap-2 rounded border border-approve-500/45 bg-approve-950/40 px-4 py-2.5 text-sm font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/70"
          >
            Watch it refuse something
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-2 text-[12px] text-mute-2">
            Six examples, checked live against your rules. Three are refused,
            each for a different reason.
          </p>
        </header>
      </Reveal>

      <Reveal delay={0.04}>
        <HowItWorks />
      </Reveal>

      <Reveal delay={0.06}>
        <TestnetNotice />
      </Reveal>

      {/* ── Wallet + status ──────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
          <WalletCard state={wallet} />
          <div className="space-y-4">
            <AgentStatus health={health} policy={policy.data?.policy ?? null} />
            <SystemStatus state={health} />
          </div>
        </div>
      </Reveal>

      {/* ── The pipeline ─────────────────────────────────────────── */}
      <Reveal delay={0.1}>
        <section>
          <SectionHeader
            title="What happens on every move"
            subtitle="Six steps, always in this order. None of them can be skipped."
          />
          <Card className="overflow-x-auto p-5">
            <DecisionFlow stage="idle" />
          </Card>
        </section>
      </Reveal>

      {/* ── Policy ───────────────────────────────────────────────── */}
      <Reveal delay={0.15}>
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
      <Reveal delay={0.2}>
        <section>
          <SectionHeader
            title="Recent activity"
            trailing={
              <Link
                href="/activity"
                className="font-mono text-[11px] uppercase tracking-wider text-mute-1 hover:text-ink-100"
              >
                Full trail →
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
    </div>
  );
}
