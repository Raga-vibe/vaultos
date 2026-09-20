/**
 * Request validation.
 *
 * Every route body passes through here before anything else touches it.
 * Requests arrive from a network and are untrusted in exactly the way a SERV
 * response is untrusted.
 *
 * The amount parsing below is the part worth reading twice.
 */

import { z } from "zod";
import {
  LIQUIDITY_LEVELS,
  RISK_LEVELS,
  type RiskPolicy,
} from "../policy/types";

/** A string of digits, parseable as a non-negative bigint. */
const atomicString = z
  .string()
  .regex(/^\d+$/, "must be a whole number of atomic units, as a string");

/** A decimal amount in whole tokens, e.g. "0.01". */
const decimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'must be a decimal amount such as "0.01"');

/**
 * Converts a decimal token amount to atomic units, exactly.
 *
 * Deliberately does NOT use parseFloat or Number. `0.07 * 100` is
 * 7.000000000000001 in IEEE 754, and a financial system that rounds its way
 * into a policy breach is worse than one that refuses odd input. This works on
 * the digit string directly, so the result is exact or it is an error.
 *
 * Extra precision beyond the token's decimals is rejected rather than
 * truncated — silently discarding a user's digits is how you send the wrong
 * amount.
 *
 * @param value - Decimal string, e.g. "1.5".
 * @param decimals - The token's decimal places.
 * @returns The amount in atomic units.
 * @throws If the value has more precision than the token supports.
 */
export function parseDecimalToAtomic(value: string, decimals: number): bigint {
  const [whole, fraction = ""] = value.split(".");

  if (fraction.length > decimals) {
    throw new Error(
      `"${value}" has ${fraction.length} decimal places but this token ` +
        `supports ${decimals}. Refusing to truncate.`,
    );
  }

  const padded = fraction.padEnd(decimals, "0");
  return BigInt(whole + padded);
}

/** Body of PUT /api/policy. */
export const PolicyBodySchema = z
  .object({
    maxAllocationPercent: z.number().int().min(0).max(100),
    maxRisk: z.enum(RISK_LEVELS),
    minLiquidity: z.enum(LIQUIDITY_LEVELS),
    leverageAllowed: z.boolean(),
    autoExecute: z.boolean(),

    maxTotalExposurePercent: z.number().int().min(0).max(100).optional(),
    minReserveAtomic: atomicString.optional(),
    maxActionsPerDay: z.number().int().min(0).optional(),
    maxDailyDeployedPercent: z.number().int().min(0).max(100).optional(),
    cooldownSeconds: z.number().min(0).optional(),
    allowedProtocols: z.array(z.string()).optional(),
    blockedProtocols: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Converts a validated policy body into a RiskPolicy.
 *
 * @param body - The parsed body.
 * @returns The policy, with atomic amounts as bigints.
 */
export function toRiskPolicy(
  body: z.infer<typeof PolicyBodySchema>,
): RiskPolicy {
  const { minReserveAtomic, ...rest } = body;
  return {
    ...rest,
    ...(minReserveAtomic === undefined
      ? {}
      : { minReserveAtomic: BigInt(minReserveAtomic) }),
  };
}

/**
 * Body of POST /api/evaluate and POST /api/execute.
 *
 * NOTE WHAT IS ABSENT.
 *
 * There is no risk, no liquidity, no leverage flag and no balance field. Those
 * come from the stored opportunity record and from the chain, and a caller
 * cannot supply them. If this schema accepted them, an HTTP client could
 * declare a HIGH-risk position to be LOW risk and walk straight past the
 * policy — which is the same hole the SERV boundary exists to close, reopened
 * at the network edge.
 *
 * The caller chooses WHICH opportunity and HOW MUCH. Everything the policy
 * judges is looked up, not asserted.
 */
export const ActionBodySchema = z
  .object({
    opportunityId: z.string().min(1),
    amount: decimalString.optional(),
    amountAtomic: atomicString.optional(),
  })
  .strict()
  .refine(
    (b) => (b.amount === undefined) !== (b.amountAtomic === undefined),
    { message: 'provide exactly one of "amount" or "amountAtomic"' },
  );

/** Body of POST /api/assess. */
export const AssessBodySchema = z
  .object({ opportunityId: z.string().min(1) })
  .strict();

/** A parsed request body, or the reason it was refused. */
export type ParseOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

/**
 * Parses a request body against a schema.
 *
 * @param schema - The zod schema.
 * @param raw - The unparsed body.
 * @returns A discriminated outcome. Never throws.
 */
export function parseBody<T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: z.ZodError } },
  raw: unknown,
): ParseOutcome<T> {
  const result = schema.safeParse(raw);
  if (!result.success || result.data === undefined) {
    const detail =
      result.error?.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ") ?? "invalid body";
    return { ok: false, reason: detail };
  }
  return { ok: true, value: result.data };
}
