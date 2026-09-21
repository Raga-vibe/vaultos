/**
 * Metadata for /activity.
 *
 * The page itself is a client component and cannot export metadata, so this
 * thin layout carries it. It adds no markup.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity — VaultOS",
  description:
    "The permanent record: every check, every decision, and the rule that decided it.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
