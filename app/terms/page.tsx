/**
 * Terms.
 *
 * NOT LEGAL ADVICE, and deliberately short. The important clauses here are
 * the ones that stop someone mistaking a testnet demo for a financial
 * product: no value, no advice, no warranty. Those are stated first, not
 * buried.
 */

import type { Metadata } from "next";
import { LegalPage, Section } from "../../components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms — VaultOS",
  description:
    "VaultOS is a demonstration on a test network. No real money, no financial advice, no warranty.",
};

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="20 September 2026">
      <Section heading="This is a demonstration">
        <p>
          VaultOS runs on Base Sepolia, a public <strong>test network</strong>.
          The tokens it moves have no monetary value and cannot be exchanged for
          anything. The investment opportunities shown are invented examples,
          written to demonstrate different rules working. None of them is a real
          product and none of them earns a real return.
        </p>
      </Section>

      <Section heading="Not financial advice">
        <p>
          Nothing here is financial, investment, tax or legal advice. The
          assessments shown come from a language model, are explicitly labelled
          as opinion, and are wrong often enough that the whole system is built
          to work without trusting them. Do not act on them.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          The software is provided as is, without warranty of any kind. It is a
          hackathon project rather than audited financial infrastructure.
        </p>
        <p>
          It has been tested, but testing is not proof. Smart contracts,
          wallet software and blockchains all fail in ways nobody predicted, and
          a transaction sent to a blockchain cannot be recalled.
        </p>
      </Section>

      <Section heading="If you run this yourself">
        <p>
          Do not point it at a wallet holding real funds. It is built for a test
          network, no path to a main network exists in the code, and adding one
          would be a considerably larger piece of work than changing a setting.
        </p>
        <p>
          The API has no authentication. Anyone who can reach the server can
          read your policy and ask it to act. Do not expose it publicly with a
          funded wallet attached.
        </p>
      </Section>

      <Section heading="Your responsibility">
        <p>
          You are responsible for the keys you configure, the limits you set and
          anything the agent does within them. The policy engine enforces the
          boundaries you give it — it cannot tell you whether they are the right
          ones.
        </p>
      </Section>
    </LegalPage>
  );
}
