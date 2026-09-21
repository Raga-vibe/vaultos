"use client";

/**
 * Activity.
 *
 * The append-only record, newest first. Rows expand to the raw stored detail,
 * because an audit log you cannot inspect is one you have to take on trust.
 */

import { AuditTrail } from "../../../components/audit/AuditTrail";
import { DecisionMeter } from "../../../components/usage/DecisionMeter";
import { EphemeralNotice } from "../../../components/system/SystemStatus";
import { Button, Reveal, SectionHeader } from "../../../components/ui/primitives";
import { api, useAsync } from "../../../lib/ui/api";

export default function Activity() {
  const audit = useAsync(() => api.audit(), []);
  const health = useAsync(() => api.health(), []);

  return (
    <div className="space-y-4">
      <Reveal>
        <EphemeralNotice what="the audit trail" state={health} />
        <SectionHeader
          as="h1"
          title="Audit trail"
          subtitle="Everything that happened, newest first — including every refusal. Nothing here can be edited or deleted."
          trailing={
            <Button onClick={audit.reload} busy={audit.loading}>
              Refresh
            </Button>
          }
        />
        <DecisionMeter events={audit.data?.events ?? null} />
        <AuditTrail
          events={audit.data?.events ?? null}
          loading={audit.loading}
          error={audit.error}
          onRetry={audit.reload}
        />
      </Reveal>
    </div>
  );
}
