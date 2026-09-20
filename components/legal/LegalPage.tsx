/**
 * Layout for the legal pages.
 *
 * Long-form reading, so the measure is narrow and the type larger than the
 * dashboard's. Server-rendered and static — these pages carry no state and
 * should not ship JavaScript to display a paragraph.
 */

import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-ink-800 pt-6">
      <h2 className="text-[15px] font-medium text-ink-50">{heading}</h2>
      <div className="mt-2.5 space-y-3 text-[14px] leading-relaxed text-mute-1 [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-ink-200 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-50">
          {title}
        </h1>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mute-3">
          Last updated {updated}
        </p>
      </header>

      <div className="space-y-6">{children}</div>

      <footer className="mt-10 border-t border-ink-800 pt-5">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider text-mute-1 hover:text-ink-100"
        >
          ← Back to VaultOS
        </Link>
      </footer>
    </article>
  );
}
