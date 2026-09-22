"use client";

/**
 * Live proof, on the public page.
 *
 * WHY THIS EXISTS
 *
 * Everything else on the landing page is VaultOS describing itself. A reader
 * deciding whether any of it is real has to take the whole argument on trust,
 * enter the app, and go looking. This strip is the one part of the page that
 * is not an argument: it reads the deployment's own audit trail and reports
 * what has actually happened on chain, with a link to a block explorer that
 * VaultOS does not control.
 *
 * WHAT IT MAY AND MAY NOT DO
 *
 * It renders nothing at all unless the trail actually contains a confirmed
 * execution. No placeholder, no "coming soon", no zero-state pretending to be
 * a number. A proof point that appears when there is nothing to prove is
 * worse than no proof point, because it teaches the reader that the numbers
 * here are decoration.
 *
 * Every figure is counted from events the server wrote. Nothing is hardcoded.
 * That matters beyond honesty: a hash pasted into the markup would keep
 * claiming a transaction that a forked deployment never made.
 *
 * It fails quiet. A failed fetch renders nothing rather than an error — this
 * is a marketing surface, and a visitor who cannot reach the API has learned
 * nothing useful from a red box. The workspace is where failures are reported
 * honestly, because that is where they change what you should do next.
 *
 * It reads. It never decides anything.
 */

import { useEffect, useState } from "react";
import { api } from "../../lib/ui/api";
import { summariseProof, type Proof } from "../../lib/ui/proof";

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-lg leading-none text-ink-50">{value}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-mute-1">{label}</p>
    </div>
  );
}

export function LiveProof() {
  const [proof, setProof] = useState<Proof | null>(null);

  useEffect(() => {
    let live = true;
    api
      .audit()
      .then((r) => {
        if (live) setProof(summariseProof(r.events));
      })
      .catch(() => {
        /* Quiet by design — see the note at the top of this file. */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!proof) return null;

  const short = `${proof.hash.slice(0, 10)}…${proof.hash.slice(-8)}`;

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/50 p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute-3">
        On this deployment, so far
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-3">
        <Figure value={String(proof.decisions)} label="Rules checks run" />
        <Figure
          value={String(proof.refusals)}
          label="Moves refused by policy"
        />
        <Figure value={String(proof.assessments)} label="SERV assessments" />
      </div>

      <div className="mt-5 border-t border-ink-800 pt-4">
        <p className="text-[13px] leading-relaxed text-ink-200">
          The most recent approved move was sent and confirmed in a block.
        </p>
        <a
          href={`https://sepolia.basescan.org/tx/${proof.hash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="group mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-info-500 transition-colors hover:text-ink-100"
        >
          <span className="break-all">{short}</span>
          {proof.block ? (
            <span className="text-mute-2">block {proof.block}</span>
          ) : null}
          <span aria-hidden="true" className="text-[10px]">
            View on BaseScan ↗
          </span>
        </a>
        <p className="mt-2 text-[11px] leading-relaxed text-mute-3">
          A real transaction on the Base Sepolia test network. The money has no
          value; the transaction is genuine and you can check it yourself.
        </p>
      </div>
    </div>
  );
}
