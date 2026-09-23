"use client";

/**
 * Opportunities.
 *
 * A list beside a decision. On a wide screen the six moves sit in a column on
 * the left that stays put, and the decision for whichever one is selected
 * fills the right. Clicking a row changes what is next to it — never
 * something below the fold — so the click visibly does something, and a
 * reader can walk all six in a row and watch the verdicts change.
 *
 * On a phone there is no room beside anything, so the decision appears under
 * the list and the page scrolls to it.
 *
 * Every row is evaluated against the live policy on load, so the list shows
 * real verdicts rather than a guess. Those come from POST /api/evaluate — a
 * dry run: the browser asks the server what it thinks and prints the answer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OpportunityCard } from "../../../components/opportunities/OpportunityCard";
import { Workbench } from "../../../components/decision/Workbench";
import {
  ErrorNote,
  Pill,
  Reveal,
  SectionHeader,
  Skeleton,
} from "../../../components/ui/primitives";
import { api, useAsync, type Verdict } from "../../../lib/ui/api";

/** A nominal amount used only to produce a comparable verdict per card. */
const PROBE_AMOUNT = "0.01";

export default function Opportunities() {
  const reduce = useReducedMotion();
  const list = useAsync(() => api.opportunities(), []);
  const [verdicts, setVerdicts] = useState<Record<
    string,
    { verdict: Verdict | null; error: string | null }
  > | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [probeNonce, setProbeNonce] = useState(0);
  const detail = useRef<HTMLElement>(null);
  const listTop = useRef<HTMLDivElement>(null);

  /*
    On a phone the decision renders under the list, which is exactly the
    "did anything happen?" problem this layout exists to solve. So on narrow
    screens, selecting a move brings the decision into view. On wide screens
    it is already beside the list and nothing scrolls.
  */
  useEffect(() => {
    if (!selected) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    // Wait for the outgoing panel to leave. Scrolling while the short empty
    // state is still mounted stops short, because the page is not yet tall
    // enough to bring the decision to the top.
    const t = setTimeout(
      () =>
        detail.current?.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        }),
      reduce ? 0 : 240,
    );
    return () => clearTimeout(t);
  }, [selected, reduce]);

  const opportunities = list.data?.opportunities;

  // Evaluations run in parallel, with a ceiling.
  //
  // Each one costs an RPC read of the on-chain balance. On the public Base
  // Sepolia endpoint that read measured six to seven seconds and the endpoint
  // rate-limits, so this used to run two at a time — six serialised reads is
  // slow, but six rate-limited ones is slower. With a dedicated RPC endpoint
  // configured (RPC_URL), the reads are fast and the rate limit is generous,
  // so the whole grid can go at once.
  //
  // The ceiling stays because it is what keeps a future change — more cards,
  // a worse endpoint — from turning this back into a stampede. Results are
  // written as they arrive, so cards fill in progressively rather than the
  // grid waiting on the slowest one.
  //
  // Nothing about this affects safety. Every probe is a dry run: POST
  // /api/evaluate builds the canonical action server-side, runs the engine,
  // and returns a verdict. It executes nothing and records no execution.
  useEffect(() => {
    if (!opportunities) return;
    let cancelled = false;
    const CONCURRENCY = 6;
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

    void Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    return () => {
      cancelled = true;
    };
  }, [opportunities, probeNonce]);

  /** Re-evaluates every card. An event handler, so it may set state. */
  const reprobe = useCallback(() => {
    setVerdicts(null);
    setProbeNonce((n) => n + 1);
  }, []);

  // What the six cards actually say, for the sentence above them.
  const decided = Object.values(verdicts ?? {})
    .map((v) => v.verdict?.decision)
    .filter((d): d is "APPROVED" | "REJECTED" => Boolean(d));
  const passed = decided.filter((d) => d === "APPROVED").length;
  const refused = decided.length - passed;
  const counted = decided.length;

  const chosen =
    list.data?.opportunities.find((o) => o.id === selected) ?? null;

  /*
    Where to start, if the reader doesn't know. The move advertising the
    biggest return — chosen from the data, not by id, and described only by
    what it advertises. What SERV and the rules make of it is for the panel
    to show, not for this button to promise.
  */
  const suggested =
    list.data?.opportunities.reduce<
      (typeof list.data.opportunities)[number] | null
    >(
      (best, o) =>
        !best || o.estimatedApyBps > best.estimatedApyBps ? o : best,
      null,
    ) ?? null;

  return (
    <div className="space-y-8">
      <Reveal>
        {/*
          One sentence of purpose, because a first-time reader treats
          "opportunity" as an offer and goes hunting for the best one. There
          isn't one. The tally beside it is counted from the rows' own
          verdicts, so it cannot contradict them.
        */}
        <SectionHeader
          as="h1"
          title="Review an opportunity"
          subtitle="Six made-up moves an AI might try with your wallet, each written to trip a different limit. None are real investments."
          trailing={
            counted > 0 ? (
              <div className="flex items-center gap-2" aria-live="polite">
                <Pill tone="approve">
                  {passed} {passed === 1 ? "passes" : "pass"}
                </Pill>
                <Pill tone="reject">{refused} refused</Pill>
              </div>
            ) : null
          }
        />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* ── The six moves ───────────────────────────────────────── */}
        <div
          ref={listTop}
          className="scroll-mt-20 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1"
        >
          {list.error ? (
            <ErrorNote message={list.error} onRetry={list.reload} />
          ) : list.loading || !list.data ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <ul className="list-none space-y-2">
              {list.data.opportunities.map((o, n) => (
                <motion.li
                  key={o.id}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: n * 0.04,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <OpportunityCard
                    opportunity={o}
                    verdict={verdicts?.[o.id]?.verdict ?? null}
                    verdictError={verdicts?.[o.id]?.error ?? null}
                    loading={verdicts?.[o.id] === undefined}
                    selected={selected === o.id}
                    onSelect={() => setSelected(o.id)}
                  />
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* ── The decision, beside the list ───────────────────────── */}
        <section
          ref={detail}
          aria-label="Decision"
          className="min-w-0 scroll-mt-20"
        >
          <AnimatePresence mode="wait" initial={false}>
            {chosen ? (
              <motion.div
                key={chosen.id}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* On a phone the list is above; offer the way back to it. */}
                <button
                  type="button"
                  onClick={() =>
                    listTop.current?.scrollIntoView({
                      behavior: reduce ? "auto" : "smooth",
                      block: "start",
                    })
                  }
                  className="mb-3 font-mono text-[11px] uppercase tracking-wider text-mute-1 transition-colors hover:text-ink-100 lg:hidden"
                >
                  ↑ All six moves
                </button>
                <Workbench
                  key={chosen.id}
                  opportunity={chosen}
                  onActivity={reprobe}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-dashed border-ink-700 px-6 py-12 text-center lg:py-20"
              >
                <p className="text-[15px] font-medium text-ink-100">
                  <span className="hidden lg:inline">
                    Pick a move on the left.
                  </span>
                  <span className="lg:hidden">Pick a move above.</span>
                </p>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-mute-1">
                  You&rsquo;ll see what SERV suggests next to what your rules
                  decide — and which one actually gets a say.
                </p>
                {suggested ? (
                  <button
                    type="button"
                    onClick={() => setSelected(suggested.id)}
                    className="mt-6 inline-flex items-center gap-2 rounded border border-approve-500/50 bg-approve-950/50 px-4 py-2.5 text-sm font-medium text-approve-400 transition-[background-color,border-color,transform] hover:border-approve-500 hover:bg-approve-950/80 active:scale-[0.98]"
                  >
                    Start with {suggested.name}
                    <span aria-hidden="true">→</span>
                  </button>
                ) : null}
                {suggested ? (
                  <p className="mt-2 text-[12px] text-mute-2">
                    It promises the biggest return. Watch what your rules do
                    with it.
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
