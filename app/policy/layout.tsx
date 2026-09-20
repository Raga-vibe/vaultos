/**
 * Metadata for /policy.
 *
 * The page itself is a client component and cannot export metadata, so this
 * thin layout carries it. It adds no markup.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policy — VaultOS",
  description:
    "The twelve boundaries your autonomous wallet cannot cross.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
