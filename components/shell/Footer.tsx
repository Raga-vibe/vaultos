"use client";

/**
 * The footer, for both shells.
 *
 * There used to be two of these — one in SiteShell, one in AppShell — saying
 * almost the same thing in almost the same markup. Two copies of a footer is
 * how a product ends up with two different answers to "what network is this
 * on", so there is now one definition and a variant.
 *
 * WHAT A FOOTER IS FOR HERE
 *
 * On most products a footer is where links go to die. On this one it is doing
 * real work, because the single most useful thing VaultOS can offer a sceptical
 * reader is a way to stop taking its word for anything. So the "Check it
 * yourself" column is the one that exists first: the source, the chain
 * explorer, and the model the reasoning actually runs on. Everything else is
 * arranged around it.
 *
 * The testnet line is stated twice on purpose — once as a chip you cannot miss
 * and once in the small print at the bottom — because it is the one claim that
 * matters if someone skims. Over-stating it is a cheap mistake. Under-stating
 * it is not.
 *
 * TWO VARIANTS
 *
 * "site" is the full four-column footer for the public pages, where a visitor
 * is deciding whether this is real.
 *
 * "app" is a compressed two-row version for the workspace, where the same
 * person has already decided and is trying to get something done. A tall
 * footer under a tool is furniture in the way. It keeps the verification
 * links, because those stay useful, and drops the marketing.
 */

import clsx from "clsx";
import Link from "next/link";
import { Brand } from "./Brand";

/**
 * Where the footer points.
 *
 * External destinations are listed once, here, so a moved repository or a
 * renamed explorer is a single edit rather than a hunt. Nothing in this list
 * is environment-dependent — the wallet address deliberately is not here,
 * because it is resolved at runtime from CDP and a hardcoded copy would
 * quietly start lying the first time somebody deploys this with their own
 * credentials. The address lives on the wallet card, where it is read from
 * the chain, and links to the explorer from there.
 */
const EXTERNAL = {
  source: "https://github.com/Raga-vibe/vaultos",
  explorer: "https://sepolia.basescan.org",
  serv: "https://openserv.ai",
  hackathon: "https://www.openserv.ai/hackathon",
  agentkit: "https://docs.cdp.coinbase.com/agent-kit/welcome",
} as const;

/** An outbound link. The arrow is the affordance; the rel is the hygiene. */
function Out({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group inline-flex items-center gap-1 text-[13px] text-mute-1 transition-colors hover:text-ink-100"
    >
      {children}
      <span
        aria-hidden="true"
        className="text-[10px] text-mute-3 transition-colors group-hover:text-ink-200"
      >
        ↗
      </span>
    </a>
  );
}

/** An internal link, matched to Out so a column reads evenly. */
function In({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[13px] text-mute-1 transition-colors hover:text-ink-100"
    >
      {children}
    </Link>
  );
}

/** One labelled column. */
function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title} className="flex flex-col gap-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute-3">
        {title}
      </p>
      {children}
    </nav>
  );
}

/**
 * The network chip.
 *
 * Amber, not red. Red in this product means one thing — a policy refusal —
 * and spending it on a standing disclaimer would blunt the only colour that
 * has to keep its meaning. The glyph carries it for anyone who cannot see the
 * hue at all.
 */
function NetworkChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-warn-500/30 bg-warn-950/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-warn-400">
      <span aria-hidden="true">!</span>
      Base Sepolia · test network
    </span>
  );
}

export function Footer({
  variant = "site",
  className,
}: {
  variant?: "site" | "app";
  className?: string;
}) {
  const year = 2026;

  /* The fine print, identical in both variants. It is the thing most worth
     keeping identical. */
  const finePrint = (
    <p className="text-[11px] leading-relaxed text-mute-3">
      No real money. Nothing here earns a return, and none of it is financial
      advice. There is no mainnet path in the code.
    </p>
  );

  if (variant === "app") {
    return (
      <footer
        className={clsx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}
      >
        {/* The rule lives on the inner box so it spans the content column
            exactly, rather than overhanging it by the page's side padding. */}
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-ink-800 py-7">
          <div className="min-w-0">
            <NetworkChip />
            <div className="mt-2.5 max-w-md">{finePrint}</div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto sm:w-auto">
            <In href="/about">About</In>
            <Out href={EXTERNAL.source}>Source</Out>
            <Out href={EXTERNAL.explorer}>Explorer</Out>
            <In href="/privacy">Privacy</In>
            <In href="/terms">Terms</In>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={clsx("border-t border-ink-800", className)}>
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Identity. One sentence, because the whole site is the long
              version and a footer that re-pitches is a footer nobody reads. */}
          <div className="flex flex-col gap-3">
            <Link href="/" aria-label="VaultOS home" className="w-fit">
              <Brand size={20} textClassName="text-[16px]" />
            </Link>
            <p className="max-w-xs text-[13px] leading-relaxed text-mute-1">
              A spending limit for AI that can move your money. SERV suggests;
              your rules decide.
            </p>
            <div className="mt-1">
              <NetworkChip />
            </div>
          </div>

          <Column title="Product">
            <In href="/#how-it-works">How it works</In>
            <In href="/about">About</In>
            <Link
              href="/app"
              className="w-fit text-[13px] font-medium text-approve-400 transition-colors hover:text-ink-50"
            >
              Enter VaultOS →
            </Link>
          </Column>

          {/* The column this footer exists for. */}
          <Column title="Check it yourself">
            <Out href={EXTERNAL.source}>Source on GitHub</Out>
            <Out href={EXTERNAL.explorer}>Base Sepolia explorer</Out>
            <Out href={EXTERNAL.serv}>SERV Reasoning</Out>
            <Out href={EXTERNAL.agentkit}>Coinbase AgentKit</Out>
          </Column>

          <Column title="Legal">
            <In href="/privacy">Privacy</In>
            <In href="/terms">Terms</In>
          </Column>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-t border-ink-800 pt-6">
          <div className="max-w-lg">{finePrint}</div>
          <p className="font-mono text-[11px] text-mute-3">
            © {year} VaultOS ·{" "}
            <a
              href={EXTERNAL.hackathon}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink-200"
            >
              Built for the SERV Hackathon ↗
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
