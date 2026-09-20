/**
 * Opportunity assessment via SERV.
 *
 * Split deliberately into two pieces:
 *
 *   parseAssessment()   pure, offline, no network. Everything that decides
 *                       whether a response is acceptable lives here, so it
 *                       can be tested exhaustively without credentials.
 *   assessOpportunity() the network call, which delegates all judgement about
 *                       the response to parseAssessment().
 *
 * The result is advisory. It is shown to the user and written to the audit
 * log. It is not an input to the policy engine.
 */

import {
  getServClient,
  isShadowAgentFailure,
  SERV_MODEL,
  SERV_REASONING_EFFORT,
  SERV_TOOLS,
} from "./client";
import {
  ASSESSMENT_RESPONSE_FORMAT,
  AssessmentSchema,
  type Assessment,
} from "./schema";
import type { Opportunity } from "../opportunities/source";

/** Outcome of parsing a SERV response. Never throws; always discriminated. */
export type ParseResult =
  | { ok: true; assessment: Assessment }
  | { ok: false; reason: string };

/**
 * Strips a markdown code fence if the model wrapped its JSON in one.
 *
 * Lenient on shape, not on content: whatever comes out still has to satisfy
 * the Zod schema, and a fenced response that fails validation is still
 * rejected.
 *
 * @param text - Raw response text.
 * @returns The text with any surrounding fence removed.
 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Validates a raw SERV response into an Assessment.
 *
 * Pure. No network, no clock, no environment. Rejects anything it cannot
 * positively confirm.
 *
 * @param raw - The message content from SERV. Any type; treated as untrusted.
 * @returns A discriminated result.
 */
export function parseAssessment(raw: unknown): ParseResult {
  if (raw === null || raw === undefined) {
    return { ok: false, reason: "Response content was null or undefined." };
  }

  let candidate: unknown = raw;

  if (typeof raw === "string") {
    const text = stripCodeFence(raw);
    if (text === "") {
      return { ok: false, reason: "Response content was an empty string." };
    }
    try {
      candidate = JSON.parse(text);
    } catch (error) {
      return {
        ok: false,
        reason: `Response content was not valid JSON: ${String(error)}`,
      };
    }
  }

  if (typeof candidate !== "object" || candidate === null) {
    return {
      ok: false,
      reason: `Expected a JSON object, got ${candidate === null ? "null" : typeof candidate}.`,
    };
  }

  if (Array.isArray(candidate)) {
    return { ok: false, reason: "Expected a JSON object, got an array." };
  }

  const parsed = AssessmentSchema.safeParse(candidate);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, reason: `Schema validation failed — ${detail}` };
  }

  return { ok: true, assessment: parsed.data };
}

/** Outcome of an assessment attempt. */
export type AssessResult =
  | { ok: true; assessment: Assessment; raw: string }
  | { ok: false; reason: string; raw: string | null };

/**
 * Builds the prompt sent to SERV.
 *
 * The prompt states plainly that the model's output is advisory. This is a
 * courtesy to the model, not a control — the control is that the policy
 * engine never reads the response.
 *
 * @param opportunity - The opportunity to assess.
 * @param walletBalanceAtomic - Real balance, for context only.
 * @returns The user-role prompt text.
 */
function buildPrompt(
  opportunity: Opportunity,
  walletBalanceAtomic: bigint,
): string {
  const balance = (
    Number(walletBalanceAtomic) /
    10 ** opportunity.tokenDecimals
  ).toFixed(opportunity.tokenDecimals);

  return [
    `Assess this on-chain opportunity for a cautious retail user.`,
    ``,
    `Name: ${opportunity.name}`,
    `Protocol: ${opportunity.protocol}`,
    `Chain ID: ${opportunity.chainId}`,
    `Token: ${opportunity.tokenSymbol} (${opportunity.tokenAddress})`,
    `Estimated APY: ${(opportunity.estimatedApyBps / 100).toFixed(2)}%`,
    `Recorded risk band: ${opportunity.risk}`,
    `Recorded liquidity band: ${opportunity.liquidity}`,
    `Uses leverage: ${opportunity.usesLeverage}`,
    `Description: ${opportunity.description}`,
    ``,
    `Wallet balance: ${balance} ${opportunity.tokenSymbol}`,
    ``,
    `Your assessment is advisory. A separate deterministic policy engine `,
    `decides what is permitted; your recommended allocation is a suggestion `,
    `and will be overridden by that engine. Be candid about downside.`,
  ].join("\n");
}

/**
 * Requests an assessment from SERV.
 *
 * @param opportunity - The opportunity to assess.
 * @param walletBalanceAtomic - Real on-chain balance, for prompt context.
 * @returns A discriminated result. Never throws.
 */
export async function assessOpportunity(
  opportunity: Opportunity,
  walletBalanceAtomic: bigint,
): Promise<AssessResult> {
  let raw: string | null = null;

  try {
    const client = getServClient();

    const completion = await client.chat.completions.create({
      model: SERV_MODEL,
      reasoning_effort: SERV_REASONING_EFFORT,
      response_format: ASSESSMENT_RESPONSE_FORMAT,
      tools: SERV_TOOLS,
      messages: [
        {
          role: "system",
          content:
            "You are a conservative on-chain risk analyst. Reply only with " +
            "JSON matching the provided schema.",
        },
        { role: "user", content: buildPrompt(opportunity, walletBalanceAtomic) },
      ],
    } as any);

    const content = (completion as any)?.choices?.[0]?.message?.content;
    raw = typeof content === "string" ? content : null;

    const parsed = parseAssessment(content);
    if (!parsed.ok) {
      return { ok: false, reason: parsed.reason, raw };
    }

    return { ok: true, assessment: parsed.assessment, raw: raw ?? "" };
  } catch (error) {
    if (isShadowAgentFailure(error)) {
      return {
        ok: false,
        reason:
          "SERV Shadow Agent returned 502: validation or regeneration failed. " +
          "Treating as a hard reject rather than accepting unvalidated content.",
        raw,
      };
    }
    return {
      ok: false,
      reason: `SERV request failed: ${String(error)}`,
      raw,
    };
  }
}
