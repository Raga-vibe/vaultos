"use client";

/**
 * Policy.
 *
 * The full rule set on one screen. The frontend is a control surface: it
 * sends the whole policy to PUT /api/policy and reports whatever the server
 * says back, including refusals, in the server's own words.
 */

import { PolicyPanel } from "../../components/policy/PolicyPanel";
import { Card, Reveal } from "../../components/ui/primitives";
import { api, useAsync } from "../../lib/ui/api";

export default function PolicyPage() {
  const policy = useAsync(() => api.policy(), []);

  return (
    <div className="space-y-6">
      <Reveal>
        <PolicyPanel
          policy={policy.data?.policy ?? null}
          isDefault={policy.data?.isDefault ?? false}
          loading={policy.loading}
          error={policy.error}
          onRetry={policy.reload}
          onSaved={() => policy.reload()}
        />
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="p-5">
          <h3 className="text-[13px] font-medium text-ink-100">
            Why a single spending limit isn&rsquo;t enough
          </h3>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mute-1">
            Say you allow 20% per move. That sounds safe — but the agent can
            make twenty moves. Each one takes 20% of whatever is left, each one
            is perfectly within your rule, and the wallet ends up empty. Worse,
            it never even stops: 20% of a shrinking balance is always
            &ldquo;allowed&rdquo;.
          </p>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mute-1">
            That is what the other rules are for. A ceiling on the total. An
            amount that must never be touched. A cap per day. A pause between
            moves. Together they close the gap a single percentage leaves open.
          </p>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mute-2">
            And if a rule you set ever can&rsquo;t be checked, the answer is no.
            Never a maybe.
          </p>
        </Card>
      </Reveal>
    </div>
  );
}
