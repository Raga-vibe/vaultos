import type { Metadata } from "next";
import { AppShell } from "../components/shell/AppShell";
import "./globals.css";

const TITLE = "VaultOS — Autonomous finance, with boundaries";
const DESCRIPTION =
  "The control layer for autonomous wallets. An AI advises; it never decides. " +
  "A deterministic policy engine checks every move against your rules, and it " +
  "has never read a word the AI wrote.";

/**
 * The absolute origin, used to resolve the social card images.
 *
 * Next needs an absolute URL for og:image — a relative path is silently
 * dropped by every crawler that reads it. `SITE_URL` is the same variable the
 * sitemap already reads, so the two can never disagree; on Vercel it falls
 * back to the deployment's own hostname, and locally to the dev server.
 *
 * NEXT_PUBLIC_ is deliberately not used here. This runs at build time on the
 * server, and the origin is not a credential, but keeping every environment
 * read server-side is the rule this project does not make exceptions to.
 */
const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
