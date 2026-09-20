/**
 * Privacy policy.
 *
 * Written to be accurate rather than impressive. This application has no
 * accounts, no tracking, no analytics and no cookies, so the honest version
 * of this page is mostly a list of things that do not happen — and saying so
 * plainly is worth more than boilerplate describing data handling that does
 * not exist.
 *
 * NOT LEGAL ADVICE. Every statement below was checked against what the code
 * actually does. If the application later gains analytics, accounts or any
 * third-party script, this page stops being true and must be rewritten.
 */

import type { Metadata } from "next";
import { LegalPage, Section } from "../../components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — VaultOS",
  description:
    "VaultOS collects no personal data, sets no cookies and runs no analytics.",
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="20 September 2026">
      <Section heading="The short version">
        <p>
          VaultOS collects nothing about you. No accounts, no cookies, no
          analytics, no tracking pixels, no third-party scripts. There is no
          sign-up, so there is nothing to sign up with.
        </p>
      </Section>

      <Section heading="What is stored, and where">
        <p>
          Three things are recorded, and all of them concern the agent rather
          than you:
        </p>
        <ul>
          <li>
            <strong>Your policy</strong> — the limits you set. Numbers and
            settings, nothing identifying.
          </li>
          <li>
            <strong>The audit trail</strong> — what was checked, what was
            decided, and which rule decided it.
          </li>
          <li>
            <strong>Executed actions</strong> — amounts and timestamps, used by
            the daily limits.
          </li>
        </ul>
        <p>
          By default these live in the server&rsquo;s memory and disappear when
          it restarts. If a Supabase database is configured, they are written
          there instead, using a key that never leaves the server.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          None. Not for analytics, not for preferences, not for sessions. That
          is why there is no cookie banner — showing one where no cookies exist
          would be theatre rather than consent.
        </p>
      </Section>

      <Section heading="The blockchain">
        <p>
          Transactions are submitted to Base Sepolia, a public test network.
          Anything sent to a public blockchain is public, permanent and outside
          anyone&rsquo;s control — including ours. The wallet address and every
          transaction it makes can be read by anyone, forever.
        </p>
        <p>
          Base Sepolia is a test network. The tokens have no monetary value.
        </p>
      </Section>

      <Section heading="Third parties">
        <p>The server talks to three services, and only the server does:</p>
        <ul>
          <li>
            <strong>Coinbase Developer Platform</strong> — holds the
            agent&rsquo;s wallet keys and broadcasts transactions.
          </li>
          <li>
            <strong>OpenServ (SERV)</strong> — receives the text of an
            opportunity when you ask for an assessment, and returns an opinion.
          </li>
          <li>
            <strong>Supabase</strong> — stores the records above, if configured.
          </li>
        </ul>
        <p>
          Your browser never contacts any of them, and no credential for any of
          them is ever sent to your browser.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          This is a hackathon project. Questions belong with whoever is running
          the instance you are looking at.
        </p>
      </Section>
    </LegalPage>
  );
}
