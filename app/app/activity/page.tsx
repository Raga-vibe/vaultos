"use client";

/**
 * Activity.
 *
 * The append-only record, newest first. Rows expand to the raw stored detail,
 * because an audit log you cannot inspect is one you have to take on trust.
 */

import { AuditTrail } from "../../../components/audit/AuditTrail";
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
          subtitle="Append-only, newest first. Every assessment, every verification, every refusal and every transaction — with the rule that produced it. Nothing here can be edited or deleted, not even by the agent."
          trailing={
            <Button onClick={audit.reload} busy={audit.loading}>
              Refresh
            </Button>
          }
        />
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
