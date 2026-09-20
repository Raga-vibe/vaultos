/**
 * Metadata for /opportunities.
 *
 * The page itself is a client component and cannot export metadata, so this
 * thin layout carries it. It adds no markup.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Opportunities — VaultOS",
  description:
    "Six examples, each checked against your rules. Three pass, three don't — for three different reasons.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
