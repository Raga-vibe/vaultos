import type { Metadata } from "next";
import { AppShell } from "../components/shell/AppShell";
import "./globals.css";

const TITLE = "VaultOS — Autonomous finance, with boundaries";
const DESCRIPTION =
  "The control layer for autonomous wallets. An AI advises; it never decides. " +
  "A deterministic policy engine checks every move against your rules, and it " +
  "has never read a word the AI wrote.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "VaultOS",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "VaultOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
