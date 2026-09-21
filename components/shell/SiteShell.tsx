"use client";

/**
 * The public shell — landing, about, privacy, terms.
 *
 * Deliberately a different frame from the workspace. The application wears a
 * fixed rail because you live in it; these pages wear a thin header because
 * you read them once and leave. Making them share a chrome would blur the one
 * distinction the split exists to draw: this side explains VaultOS, the other
 * side is VaultOS.
 *
 * Three links and one action. A public site for a product with four screens
 * does not need a mega-menu, and every extra link here is one more decision
 * between a visitor and the thing they came to see.
 */

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { Footer } from "./Footer";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="VaultOS home">
            <Brand size={18} textClassName="text-[15px]" />
          </Link>

          <nav className="ml-auto flex items-center gap-1" aria-label="Site">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={
                  l.href === "/about" && pathname === "/about"
                    ? "page"
                    : undefined
                }
                className={clsx(
                  "hidden rounded px-2.5 py-1.5 text-[13px] transition-colors sm:block",
                  l.href === "/about" && pathname === "/about"
                    ? "text-ink-50"
                    : "text-mute-1 hover:text-ink-100",
                )}
              >
                {l.label}
              </Link>
            ))}

            <Link
              href="/app"
              className="ml-1 rounded border border-approve-500/45 bg-approve-950/40 px-3 py-1.5 text-[13px] font-medium text-approve-400 transition-colors hover:border-approve-500 hover:bg-approve-950/70"
            >
              Enter VaultOS
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <Footer variant="site" />
    </div>
  );
}
