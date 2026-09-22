"use client";

/**
 * Application shell.
 *
 * A slim bar across the top, and on phones a bottom bar under the thumb.
 *
 * The workspace used to wear a fixed left rail. It cost 224 pixels of every
 * screen to hold four links and a tagline, and it made each page feel boxed
 * into the right-hand two-thirds of the window. A top bar holds the same four
 * destinations in one line and gives the content back its width.
 *
 * Four destinations, because the product has four things to say. Inventing a
 * fifth page to look larger would only dilute them.
 *
 * The content column and the bar share one max width, so the left edge of the
 * wordmark and the left edge of every page title sit on the same line. That
 * alignment is most of what makes a layout read as deliberate.
 */

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { BrandMark, Wordmark } from "./Brand";
import { Footer } from "./Footer";

const NAV = [
  { href: "/app", label: "Overview", glyph: "◎" },
  { href: "/app/opportunities", label: "Opportunities", glyph: "◈" },
  { href: "/app/policy", label: "Policy", glyph: "▤" },
  { href: "/app/activity", label: "Activity", glyph: "≡" },
] as const;

/** Shared width, so the bar and the page line up. */
const FRAME = "mx-auto w-full max-w-6xl px-4 sm:px-6";

/**
 * True when a nav item matches the current path.
 *
 * @param href - The item's path.
 * @param pathname - Current path.
 * @returns Whether it is active.
 */
function isActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

/**
 * The network marker. Amber, because red belongs to policy refusals and
 * nothing else; the glyph carries it for anyone who cannot see the hue.
 */
function TestnetChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-warn-500/30 bg-warn-950/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-warn-400">
      <span aria-hidden="true">!</span>
      <span className="hidden sm:inline">Base Sepolia · </span>Testnet
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
        <div className={clsx(FRAME, "flex h-14 items-center gap-6")}>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="VaultOS — about"
          >
            <BrandMark size={18} />
            <Wordmark className="text-[15px]" />
          </Link>

          {/* Desktop and tablet navigation. */}
          <nav aria-label="Main" className="hidden h-full md:block">
            <ul className="flex h-full items-stretch gap-1">
              {NAV.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href} className="relative flex">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center px-3 text-[13px] transition-colors",
                        active
                          ? "text-ink-50"
                          : "text-mute-1 hover:text-ink-100",
                      )}
                    >
                      {item.label}
                    </Link>
                    {/* The underline slides between tabs rather than
                        blinking, so the eye follows where it went. */}
                    {active ? (
                      <motion.span
                        layoutId={reduce ? undefined : "nav-underline"}
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-approve-500"
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-mute-3 xl:block">
              Autonomous finance, with boundaries
            </p>
            <TestnetChip />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <div className={clsx(FRAME, "py-7 md:py-10")}>{children}</div>
      </main>

      <div className="pb-20 md:pb-0">
        <Footer variant="app" />
      </div>

      {/* Phone navigation, under the thumb. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                    active ? "text-ink-50" : "text-mute-2",
                  )}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {item.glyph}
                  </span>
                  {item.label}
                </Link>
                {active ? (
                  <motion.span
                    layoutId={reduce ? undefined : "nav-underline-mobile"}
                    className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-approve-500"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
