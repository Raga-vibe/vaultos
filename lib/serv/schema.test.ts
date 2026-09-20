/**
 * Schema tests.
 *
 * Two jobs:
 *   1. Keep ASSESSMENT_JSON_SCHEMA and AssessmentSchema in sync. They are two
 *      hand-written representations of one contract, and hand-written pairs
 *      drift. These tests fail the build when they do.
 *   2. Hold parseAssessment() to rejecting everything it cannot confirm.
 */

import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_BANDS,
  ASSESSMENT_JSON_SCHEMA,
  ASSESSMENT_RESPONSE_FORMAT,
  ASSESSMENT_SCHEMA_NAME,
  AssessmentSchema,
} from "./schema";
import { parseAssessment } from "./assess";

const VALID = {
  summary: "A low-risk stablecoin supply position on a testnet lending pool.",
  riskAssessment: "LOW",
  liquidityAssessment: "HIGH",
  recommendedAllocationPercent: 15,
  usesLeverage: false,
  rationale: "Unleveraged, stablecoin-denominated, withdrawable on demand.",
  concerns: ["Testnet contracts carry no audit guarantee."],
  confidence: "MEDIUM",
};

describe("JSON Schema / Zod sync", () => {
  it("declares additionalProperties: false, as strict mode requires", () => {
    expect(ASSESSMENT_JSON_SCHEMA.additionalProperties).toBe(false);
  });

  it("lists every property in required", () => {
    const properties = Object.keys(ASSESSMENT_JSON_SCHEMA.properties).sort();
    const required = [...ASSESSMENT_JSON_SCHEMA.required].sort();
    expect(required).toEqual(properties);
  });

  it("has identical key sets in the JSON Schema and the Zod schema", () => {
    const jsonKeys = Object.keys(ASSESSMENT_JSON_SCHEMA.properties).sort();
    const zodKeys = Object.keys(AssessmentSchema.shape).sort();
    expect(zodKeys).toEqual(jsonKeys);
  });

  it("uses the same enum values for riskAssessment in both", () => {
    expect([...ASSESSMENT_JSON_SCHEMA.properties.riskAssessment.enum]).toEqual([
      ...ASSESSMENT_BANDS,
    ]);
  });

  it("uses the same enum values for liquidityAssessment in both", () => {
    expect([
      ...ASSESSMENT_JSON_SCHEMA.properties.liquidityAssessment.enum,
    ]).toEqual([...ASSESSMENT_BANDS]);
  });

  it("uses the same enum values for confidence in both", () => {
    expect([...ASSESSMENT_JSON_SCHEMA.properties.confidence.enum]).toEqual([
      ...ASSESSMENT_BANDS,
    ]);
  });

  it("sends strict: true and the expected schema name", () => {
    expect(ASSESSMENT_RESPONSE_FORMAT.type).toBe("json_schema");
    expect(ASSESSMENT_RESPONSE_FORMAT.json_schema.strict).toBe(true);
    expect(ASSESSMENT_RESPONSE_FORMAT.json_schema.name).toBe(
      ASSESSMENT_SCHEMA_NAME,
    );
  });

  it("bounds recommendedAllocationPercent to 0-100 in the JSON Schema", () => {
    expect(ASSESSMENT_JSON_SCHEMA.properties.recommendedAllocationPercent.minimum).toBe(0);
    expect(ASSESSMENT_JSON_SCHEMA.properties.recommendedAllocationPercent.maximum).toBe(100);
  });
});

describe("parseAssessment accepts well-formed responses", () => {
  it("accepts a valid object", () => {
    const result = parseAssessment(VALID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.assessment.riskAssessment).toBe("LOW");
  });

  it("accepts a valid JSON string", () => {
    const result = parseAssessment(JSON.stringify(VALID));
    expect(result.ok).toBe(true);
  });

  it("accepts JSON wrapped in a markdown code fence", () => {
    const result = parseAssessment(
      "```json\n" + JSON.stringify(VALID) + "\n```",
    );
    expect(result.ok).toBe(true);
  });
});

describe("parseAssessment rejects everything it cannot confirm", () => {
  it("rejects null", () => {
    expect(parseAssessment(null).ok).toBe(false);
  });

  it("rejects undefined", () => {
    expect(parseAssessment(undefined).ok).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(parseAssessment("").ok).toBe(false);
  });

  it("rejects a non-JSON string", () => {
    expect(parseAssessment("I think this looks pretty safe!").ok).toBe(false);
  });

  it("rejects a JSON array", () => {
    expect(parseAssessment(JSON.stringify([VALID])).ok).toBe(false);
  });

  it("rejects a response missing a required field", () => {
    const { confidence: _omitted, ...missing } = VALID;
    void _omitted;
    expect(parseAssessment(missing).ok).toBe(false);
  });

  it("rejects an unexpected extra property, even though the model was told not to send one", () => {
    const extra = { ...VALID, shouldExecute: true };
    const result = parseAssessment(extra);
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-vocabulary enum value", () => {
    expect(parseAssessment({ ...VALID, riskAssessment: "EXTREME" }).ok).toBe(
      false,
    );
  });

  it("rejects an allocation percentage above 100", () => {
    expect(
      parseAssessment({ ...VALID, recommendedAllocationPercent: 140 }).ok,
    ).toBe(false);
  });

  it("rejects a string where a boolean is required", () => {
    expect(parseAssessment({ ...VALID, usesLeverage: "false" }).ok).toBe(false);
  });

  it("never throws, whatever it is handed", () => {
    const hostile: unknown[] = [
      Symbol("x"),
      () => {},
      Number.NaN,
      { toString() { throw new Error("boom"); } },
      new Map(),
    ];
    for (const value of hostile) {
      expect(() => parseAssessment(value)).not.toThrow();
      expect(parseAssessment(value).ok).toBe(false);
    }
  });
});
