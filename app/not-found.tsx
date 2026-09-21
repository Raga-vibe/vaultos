/**
 * 404.
 *
 * Kept on-brand and useful: it says where you are, offers the four places
 * worth going, and does not pretend something went wrong with the system.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../components/shell/Brand";
import { SiteShell } from "../components/shell/SiteShell";

export const metadata: Metadata = {
  title: "Page not found — VaultOS",
};

const DESTINATIONS = [
  { href: "/app", label: "Overview", hint: "Your wallet, your rules, and what to do next" },
  { href: "/app/opportunities", label: "Review an opportunity", hint: "Six examples, already checked against your rules" },
  { href: "/app/policy", label: "Policy", hint: "All twelve boundaries" },
  { href: "/app/activity", label: "Audit trail", hint: "Every assessment, decision and transaction" },
  { href: "/about", label: "About VaultOS", hint: "What it is, and what it does not claim to be" },
];

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <div className="flex items-center gap-3">
        <BrandMark size={28} />
        <p className="font-mono text-sm text-mute-1">404</p>
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-50">
        There is nothing at this address
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-mute-1">
        The page you asked for does not exist. Nothing has broken — this is just
        a link that points nowhere.
      </p>

      <ul className="mt-7 space-y-2">
        {DESTINATIONS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="block rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3 transition-colors hover:border-ink-600"
            >
              <span className="text-sm font-medium text-ink-100">{d.label}</span>
              <span className="mt-0.5 block text-[12px] text-mute-2">
                {d.hint}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </SiteShell>
  );
}
