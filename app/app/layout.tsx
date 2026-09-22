/**
 * The workspace layout.
 *
 * Everything under /app wears the application shell — a slim top bar, and a
 * bottom bar on phones. The public pages deliberately do not: the landing
 * page explains VaultOS, this side is VaultOS, and giving them the same chrome
 * would blur the one distinction the split exists to draw.
 */

import type { Metadata } from "next";
import { AppShell } from "../../components/shell/AppShell";

export const metadata: Metadata = {
  title: "Overview — VaultOS",
  description:
    "Your wallet, your limits, and the moves waiting to be checked.",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
