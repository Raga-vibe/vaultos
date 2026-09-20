"use client";

/**
 * Application shell.
 *
 * A fixed rail on desktop, a bottom bar on mobile. Four destinations, because
 * the product has four things to say and inventing a fifth page to look
 * larger would only dilute them.
 */

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Brand, BrandMark, Wordmark } from "./Brand";

const NAV = [
  { href: "/", label: "Overview", glyph: "◎" },
  { href: "/opportunities", label: "Opportunities", glyph: "◈" },
  { href: "/policy", label: "Policy", glyph: "▤" },
  { href: "/activity", label: "Activity", glyph: "≡" },
] as const;

/**
 * True when a nav item matches the current path.
 *
 * @param href - The item's path.
 * @param pathname - Current path.
 * @returns Whether it is active.
 */
function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-ink-800 bg-ink-900/60 lg:flex">
        <div className="border-b border-ink-800 px-5 py-5">
          <Link href="/" className="block">
            <Brand size={18} textClassName="text-[15px]" />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-2">
              Autonomous finance, with boundaries
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label="Main">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "relative flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                      active
                        ? "text-ink-50"
                        : "text-mute-1 hover:bg-ink-850 hover:text-ink-200",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={reduce ? undefined : "nav-active"}
                        className="absolute inset-0 rounded border border-ink-700 bg-ink-850"
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null}
                    <span className="relative" aria-hidden="true">
                      {item.glyph}
                    </span>
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-ink-800 px-5 py-4">
          <p className="font-mono text-[10px] leading-relaxed text-mute-2">
            Base Sepolia
            <br />
            Test network — no real money
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <BrandMark size={16} />
          <Wordmark className="text-sm" />
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-mute-2">
            Base Sepolia
          </span>
        </div>
      </header>

      <main className="pb-24 lg:pb-12 lg:pl-56">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>

        <footer className="mx-auto w-full max-w-6xl border-t border-ink-800 px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono text-[11px] text-mute-3">
              VaultOS · Base Sepolia · test network
            </span>
            <nav className="ml-auto flex gap-5" aria-label="Legal">
              <Link
                href="/privacy"
                className="font-mono text-[11px] uppercase tracking-wider text-mute-2 hover:text-ink-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="font-mono text-[11px] uppercase tracking-wider text-mute-2 hover:text-ink-100"
              >
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </main>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-900/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <li key={item.href}>
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
                  <span
                    className={clsx(
                      "h-0.5 w-6 rounded-full",
                      active ? "bg-approve-500" : "bg-transparent",
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
