/**
 * Policy domain types.
 *
 * This module is pure data. It imports nothing — not the SERV client, not
 * AgentKit, not Next. That isolation is deliberate: the policy engine must be
 * testable and reviewable without any network, SDK or model in the picture.
 */

/** Ordered risk bands. LOW is the most conservative. */
export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Ordered liquidity bands. HIGH is the most liquid. */
export const LIQUIDITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type LiquidityLevel = (typeof LIQUIDITY_LEVELS)[number];

/** Base Sepolia. The only chain this repo will act on. */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/**
 * The user's standing constraints.
 *
 * Set by the user, stored by us, and never derived from or modified by a model
 * response.
 *
 * The first five fields are always enforced. The rest are optional: leaving
 * one undefined means the user has not configured that constraint, and it is
 * not applied. That is a choice the user makes explicitly, not a default the
 * engine invents — and an optional constraint that IS set but cannot be
 * evaluated (because the caller supplied no context) is a rejection, not a
 * pass.
 */
export type RiskPolicy = {
  // ─── Always enforced ────────────────────────────────────────────────────
  /** Maximum share of wallet balance ONE action may deploy. Integer 0-100. */
  maxAllocationPercent: number;
  /** Highest risk band the user will accept. */
  maxRisk: RiskLevel;
  /** Lowest liquidity band the user will accept. */
  minLiquidity: LiquidityLevel;
  /** Whether any leveraged action is permissible at all. */
  leverageAllowed: boolean;
  /** Whether an approved action may execute without a human confirming it. */
  autoExecute: boolean;

  // ─── Optional: cumulative and temporal limits ───────────────────────────
  /**
   * Maximum share of wallet balance deployed across ALL open positions,
   * including this action. Stops an agent reaching full exposure through
   * many individually-compliant steps. Integer 0-100.
   */
  maxTotalExposurePercent?: number;
  /**
   * Atomic units that must remain in the wallet after the action. A floor,
   * independent of percentages — percentages shrink with the balance, so a
   * pure-percentage policy can drain a wallet asymptotically.
   */
  minReserveAtomic?: bigint;
  /** Maximum number of executed actions in the trailing 24 hours. */
  maxActionsPerDay?: number;
  /**
   * Maximum share of CURRENT balance deployed in the trailing 24 hours,
   * including this action. Integer 0-100.
   */
  maxDailyDeployedPercent?: number;
  /** Minimum seconds between executed actions. */
  cooldownSeconds?: number;
  /**
   * Protocols the agent may use. `undefined` means no allowlist is in force.
   * An empty array means nothing is permitted — which is a valid, if severe,
   * policy, and is not silently treated as "no restriction".
   */
  allowedProtocols?: string[];
  /** Protocols the agent may never use. Takes precedence over the allowlist. */
  blockedProtocols?: string[];
};

/**
 * The action actually being judged.
 *
 * Every field is assembled by our own code from two trusted sources: the
 * stored opportunity record, and the real on-chain wallet balance. No field
 * here is ever read out of a model response. This type is the boundary that
 * makes the security rule enforceable rather than aspirational.
 */
export type CanonicalAction = {
  /** Identifier of the stored opportunity this action derives from. */
  opportunityId: string;
  /** Protocol name from the stored record. */
  protocol: string;
  /** Chain the action would execute on. */
  chainId: number;
  /** Token symbol being deployed. */
  tokenSymbol: string;
  /** Amount to deploy, in the token's atomic units. From our record. */
  amountAtomic: bigint;
  /** Real on-chain balance, in the same atomic units. From the chain. */
  walletBalanceAtomic: bigint;
  /** Risk band of the opportunity. From our record. */
  risk: RiskLevel;
  /** Liquidity band of the opportunity. From our record. */
  liquidity: LiquidityLevel;
  /** Whether the opportunity involves leverage. From our record. */
  usesLeverage: boolean;
};

/** A previously executed action, as recorded in the audit log. */
export type ExecutedAction = {
  /** ISO 8601 timestamp of execution. */
  at: string;
  /** Amount deployed, in atomic units. */
  amountAtomic: bigint;
  /** Which opportunity it was. */
  opportunityId: string;
};

/**
 * Everything time- and history-dependent the engine needs, passed in.
 *
 * The engine never reads the clock and never queries a database. Both would
 * make it non-deterministic and therefore impossible to test exhaustively or
 * to reproduce when auditing a past decision. The caller supplies `now` and
 * the history; the engine does arithmetic on them.
 */
export type EvaluationContext = {
  /** The moment to evaluate against. */
  now: Date;
  /** Executed actions, most recent first or last — order does not matter. */
  recentActions: ExecutedAction[];
  /**
   * Total atomic units currently deployed across all open positions,
   * excluding this action.
   */
  openExposureAtomic: bigint;
};

/** A single failed constraint, named and explained. */
export type PolicyViolation = {
  /** Stable machine-readable code. */
  code:
    | "ALLOCATION_EXCEEDS_CAP"
    | "RISK_ABOVE_MAX"
    | "LIQUIDITY_BELOW_MIN"
    | "LEVERAGE_NOT_ALLOWED"
    | "UNSUPPORTED_CHAIN"
    | "NON_POSITIVE_AMOUNT"
    | "INSUFFICIENT_BALANCE"
    | "ZERO_BALANCE"
    | "TOTAL_EXPOSURE_EXCEEDED"
    | "RESERVE_BREACHED"
    | "DAILY_ACTION_LIMIT_REACHED"
    | "DAILY_DEPLOY_CAP_EXCEEDED"
    | "COOLDOWN_ACTIVE"
    | "PROTOCOL_NOT_ALLOWED"
    | "PROTOCOL_BLOCKED"
    | "CONTEXT_REQUIRED"
    | "MALFORMED_POLICY"
    | "MALFORMED_ACTION"
    | "MALFORMED_CONTEXT";
  /** Human-readable explanation, safe to show the user. */
  message: string;
};

/** The engine's decision. */
export type PolicyVerdict = {
  /** APPROVED only when every constraint passed. */
  decision: "APPROVED" | "REJECTED";
  /**
   * True when the action passed policy but the user has not enabled
   * autoExecute. Meaningless on a REJECTED verdict — a rejection is final and
   * no human confirmation can override it here.
   */
  requiresManualApproval: boolean;
  /** Every constraint that failed. Empty on APPROVED. */
  violations: PolicyViolation[];
  /**
   * The allocation this action represents, in basis points of wallet balance.
   * Reported for display and audit. Null when balance is zero or inputs are
   * malformed, since the ratio is undefined.
   */
  allocationBps: number | null;
  /** Which constraints were actually evaluated. For audit transparency. */
  evaluated: string[];
};
