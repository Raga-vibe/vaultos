/**
 * The SERV assessment contract.
 *
 * Two representations of one shape:
 *
 *   ASSESSMENT_JSON_SCHEMA — sent to SERV as response_format.json_schema, so
 *     the provider constrains its own decoding.
 *   AssessmentSchema       — a Zod schema we validate against on the way in.
 *
 * Both exist because the first is a request and the second is enforcement.
 * SERV's own documentation warns that a provider may not honour the schema it
 * was given, so the wire response is treated as untrusted until Zod has
 * accepted it. schema.test.ts fails the build if the two drift apart.
 *
 * Everything in an Assessment is ADVISORY. No field here is ever read by the
 * policy engine, and no field here can authorise anything. The model's opinion
 * about an allocation percentage is an opinion; the cap is enforced against
 * the canonical action instead.
 */

import { z } from "zod";

/** Bands the model may use. Mirrors the policy vocabulary deliberately. */
export const ASSESSMENT_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * JSON Schema sent to SERV.
 *
 * strict mode requires additionalProperties:false and a `required` array
 * naming every property. Both are asserted by the sync test.
 */
export const ASSESSMENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "One or two sentences describing the opportunity.",
    },
    riskAssessment: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "The model's view of the risk band.",
    },
    liquidityAssessment: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "The model's view of the liquidity band.",
    },
    recommendedAllocationPercent: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description:
        "Suggested share of wallet balance. Advisory only — the policy " +
        "engine enforces the real cap and ignores this number.",
    },
    usesLeverage: {
      type: "boolean",
      description: "Whether the model believes the strategy involves leverage.",
    },
    rationale: {
      type: "string",
      description: "Why the model reached this assessment.",
    },
    concerns: {
      type: "array",
      items: { type: "string" },
      description: "Specific risks the user should be aware of.",
    },
    confidence: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "How confident the model is in its own assessment.",
    },
  },
  required: [
    "summary",
    "riskAssessment",
    "liquidityAssessment",
    "recommendedAllocationPercent",
    "usesLeverage",
    "rationale",
    "concerns",
    "confidence",
  ],
} as const;

/** Name given to the schema in the response_format payload. */
export const ASSESSMENT_SCHEMA_NAME = "opportunity_assessment";

/**
 * Zod mirror of the JSON Schema.
 *
 * .strict() rejects any property the schema did not declare, so a provider
 * that ignores additionalProperties:false and appends fields is still caught.
 */
export const AssessmentSchema = z
  .object({
    summary: z.string().min(1),
    riskAssessment: z.enum(ASSESSMENT_BANDS),
    liquidityAssessment: z.enum(ASSESSMENT_BANDS),
    recommendedAllocationPercent: z.number().min(0).max(100),
    usesLeverage: z.boolean(),
    rationale: z.string().min(1),
    concerns: z.array(z.string()),
    confidence: z.enum(ASSESSMENT_BANDS),
  })
  .strict();

/** A validated assessment. Advisory in every respect. */
export type Assessment = z.infer<typeof AssessmentSchema>;

/** The response_format block sent with every assessment request. */
export const ASSESSMENT_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: ASSESSMENT_SCHEMA_NAME,
    strict: true,
    schema: ASSESSMENT_JSON_SCHEMA,
  },
};
