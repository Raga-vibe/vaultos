"use client";

/**
 * Opportunities.
 *
 * Every card is evaluated against the live policy on load, so the grid shows
 * real verdicts rather than a guess. Those evaluations come from
 * POST /api/evaluate — the browser asks the server what it thinks and prints
 * the answer.
 */

import { useCallback, useEffect, useState } from "react";
import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { Workbench } from "../../components/decision/Workbench";
import {
  ErrorNote,
  Reveal,
  SectionHeader,
  Skeleton,
} from "../../components/ui/primitives";
import { api, useAsync, type Verdict } from "../../lib/ui/api";

/** A nominal amount used only to produce a comparable verdict per card. */
const PROBE_AMOUNT = "0.01";

export default function Opportunities() {
  const list = useAsync(() => api.opportunities(), []);
  const [verdicts, setVerdicts] = useState<Record<
    string,
    { verdict: Verdict | null; error: string | null }
  > | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [probeNonce, setProbeNonce] = useState(0);

  const opportunities = list.data?.opportunities;

  // Evaluations run TWO AT A TIME, not all six at once.
  //
  // Each one costs an RPC read of the on-chain balance, and the public Base
  // Sepolia endpoint rate-limits. Firing six in parallel — doubled again by
  // React's development double-render — turned a page load into minutes. A
  // small concurrency limit keeps it responsive on a modest connection, and
  // results are written as they arrive so cards fill in progressively rather
  // than the whole grid waiting for the slowest one.
  useEffect(() => {
    if (!opportunities) return;
    let cancelled = false;
    const CONCURRENCY = 2;
    const queue = [...opportunities];

    async function worker() {
      while (queue.length > 0 && !cancelled) {
        const o = queue.shift();
        if (!o) return;
        let entry: { verdict: Verdict | null; error: string | null };
        try {
          const r = await api.evaluate(o.id, PROBE_AMOUNT);
          entry = { verdict: r.verdict, error: null };
        } catch (e) {
          // A failed probe surfaces the reason. It never becomes a verdict —
          // an unreachable engine is unknown, not permission.
          entry = {
            verdict: null,
            error: e instanceof Error ? e.message : String(e),
          };
        }
        if (!cancelled) {
          setVerdicts((prev) => ({ ...(prev ?? {}), [o.id]: entry }));
        }
      }
    }

    void Promise.all(
      Array.from({ length: CONCURRENCY }, () => worker()),
    );

    return () => {
      cancelled = true;
    };
  }, [opportunities, probeNonce]);

  /** Re-evaluates every card. An event handler, so it may set state. */
  const reprobe = useCallback(() => {
    setVerdicts(null);
    setProbeNonce((n) => n + 1);
  }, []);

  const chosen =
    list.data?.opportunities.find((o) => o.id === selected) ?? null;

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeader
          title="Choose an opportunity to review"
          subtitle={`Six made-up examples, each already checked against your rules at ${PROBE_AMOUNT}. Three pass. Three are refused — each by a different rule. Pick any one to take it through the full decision.`}
        />

        {list.error ? (
          <ErrorNote message={list.error} onRetry={list.reload} />
        ) : list.loading || !list.data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <ul className="grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.data.opportunities.map((o) => (
              <li key={o.id}>
                <OpportunityCard
                  opportunity={o}
                  verdict={verdicts?.[o.id]?.verdict ?? null}
                  verdictError={verdicts?.[o.id]?.error ?? null}
                  loading={verdicts?.[o.id] === undefined}
                  selected={selected === o.id}
                  onSelect={() =>
                    setSelected((s) => (s === o.id ? null : o.id))
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {chosen ? (
        <Reveal key={chosen.id}>
          <SectionHeader
            title="Decision center"
            subtitle="What SERV advises and what your policy authorises are two different questions, asked separately and answered by different code."
          />
          <Workbench key={chosen.id} opportunity={chosen} onActivity={reprobe} />
        </Reveal>
      ) : (
        <div className="rounded-lg border border-dashed border-ink-700 px-4 py-10 text-center">
          <p className="text-sm text-ink-200">
            Pick an opportunity above to open the decision center.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-mute-1">
            You will see SERV&rsquo;s advisory assessment beside the
            authoritative policy verdict — including the cases where they
            disagree.
          </p>
        </div>
      )}
    </div>
  );
}
