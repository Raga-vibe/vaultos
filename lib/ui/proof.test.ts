/**
 * The landing page makes one factual claim: that a real transaction happened.
 *
 * These tests guard the property that makes the claim safe to make — the
 * strip reports only what the trail actually contains, and reports nothing at
 * all when it contains no confirmed execution. A proof point that can appear
 * without proof is not a proof point.
 */
import { describe, expect, it } from "vitest";
import { summariseProof } from "./proof";
import type { AuditEvent } from "./api";

function ev(over: Partial<AuditEvent>): AuditEvent {
  return {
    seq: 1,
    at: "2026-09-21T15:46:48.000Z",
    type: "POLICY_EVALUATED",
    opportunityId: "opp-stable-reserve",
    detail: {},
    verdict: null,
    ...over,
  };
}

const verdict = (decision: "APPROVED" | "REJECTED") =>
  ({ decision, violations: [] }) as unknown as AuditEvent["verdict"];

const approved = ev({ verdict: verdict("APPROVED") });
const refused = ev({ verdict: verdict("REJECTED") });
const confirmed = ev({
  type: "EXECUTION_CONFIRMED",
  detail: { hash: "0x72f881165bae3584", block: "47118661" },
});

describe("summariseProof", () => {
  it("returns nothing when the trail holds no confirmed execution", () => {
    expect(summariseProof([approved, refused, refused])).toBeNull();
  });

  it("returns nothing for an empty trail", () => {
    expect(summariseProof([])).toBeNull();
  });

  it("does not treat a submitted-but-unconfirmed transaction as proof", () => {
    const submitted = ev({
      type: "EXECUTION_SUBMITTED",
      detail: { hash: "0xdeadbeef" },
    });
    expect(summariseProof([approved, submitted])).toBeNull();
  });

  it("ignores a confirmation carrying no hash", () => {
    expect(
      summariseProof([ev({ type: "EXECUTION_CONFIRMED", detail: { block: "1" } })]),
    ).toBeNull();
  });

  it("counts refusals and decisions from the trail, not from a constant", () => {
    const p = summariseProof([approved, refused, refused, confirmed]);
    expect(p?.decisions).toBe(3);
    expect(p?.refusals).toBe(2);
  });

  it("counts SERV assessments separately from policy decisions", () => {
    const assessed = ev({ type: "ASSESSMENT_RECEIVED" });
    const p = summariseProof([assessed, assessed, approved, confirmed]);
    expect(p?.assessments).toBe(2);
    expect(p?.decisions).toBe(1);
  });

  it("reports the most recent confirmation when there are several", () => {
    const older = ev({
      type: "EXECUTION_CONFIRMED",
      detail: { hash: "0xolder", block: "1" },
    });
    const p = summariseProof([older, confirmed]);
    expect(p?.hash).toBe("0x72f881165bae3584");
    expect(p?.block).toBe("47118661");
  });

  it("survives a confirmation with a hash but no block", () => {
    const p = summariseProof([
      ev({ type: "EXECUTION_CONFIRMED", detail: { hash: "0xabc" } }),
    ]);
    expect(p?.hash).toBe("0xabc");
    expect(p?.block).toBeNull();
  });
});
