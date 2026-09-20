/**
 * The policy engine.
 *
 * THIS IS THE ONLY THING IN VAULTOS THAT AUTHORISES AN ACTION.
 *
 * Properties this module must keep, and that engine.test.ts holds it to:
 *
 *   1. Pure. No I/O, no clock, no randomness, no network, no model. `now` and
 *      the action history are passed IN. Same inputs, same verdict, forever —
 *      which is what makes a past decision reproducible when auditing it.
 *   2. Fail closed. Every path that cannot establish that a constraint is
 *      satisfied returns REJECTED. There is no default-approve branch, and
 *      nothing here throws — a thrown error upstream could be caught and
 *      mistaken for "no objection".
 *   3. Blind to the model. It takes a CanonicalAction, which our own code
 *      builds from the stored opportunity and the real on-chain balance. A
 *      SERV assessment cannot reach this function, so it cannot influence
 *      the outcome even if it is wrong, adversarial, or hallucinated.
 *
 * WHY THE CUMULATIVE LIMITS EXIST
 *
 * A per-action percentage cap alone does not bound an autonomous agent. Twenty
 * separate actions, each a compliant 20% of the balance at the time, will
 * empty a wallet — every single one passes, and the wallet still ends at zero.
 * Worse, a pure-percentage rule can never quite finish draining it: 20% of a
 * shrinking balance is always "allowed", so the agent keeps going forever.
 *
 * Hence four additional bounds: total exposure across open positions, an
 * absolute reserve floor in atomic units, a rolling 24-hour deployment cap,
 * and a cooldown. Each closes a hole the others leave open.
 *
 * ARITHMETIC
 *
 * Exact integer arithmetic on bigints throughout. Every percentage check is
 * the comparison rearranged to avoid division:
 *
 *      amount * 100  <=  percent * balance
 *
 * No rounding happens, so a 20.0001% allocation against a 20% cap cannot be
 * truncated down into compliance.
 */

import {
  BASE_SEPOLIA_CHAIN_ID,
  LIQUIDITY_LEVELS,
  RISK_LEVELS,
  type CanonicalAction,
  type EvaluationContext,
  type LiquidityLevel,
  type PolicyViolation,
  type PolicyVerdict,
  type RiskLevel,
  type RiskPolicy,
} from "./types";

/** Milliseconds in 24 hours. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rank of a risk band. Higher is riskier. */
function riskRank(level: RiskLevel): number {
  return RISK_LEVELS.indexOf(level);
}

/** Rank of a liquidity band. Higher is more liquid. */
function liquidityRank(level: LiquidityLevel): number {
  return LIQUIDITY_LEVELS.indexOf(level);
}

/**
 * Checks an optional integer-percentage field.
 *
 * @param value - The value, possibly undefined.
 * @param name - Field name for the message.
 * @returns A violation, or null when absent or valid.
 */
function badPercent(value: unknown, name: string): PolicyViolation | null {
  if (value === undefined) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    return {
      code: "MALFORMED_POLICY",
      message:
        `${name} must be an integer between 0 and 100, got ${String(value)}. ` +
        `Refusing to act on an uninterpretable policy.`,
    };
  }
  return null;
}

/**
 * Validates the policy itself.
 *
 * A malformed policy is not a reason to fall back to permissive defaults. It
 * is a reason to refuse to act.
 *
 * @param policy - The policy to check.
 * @returns Violations found. Empty means structurally sound.
 */
function validatePolicy(policy: RiskPolicy): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const push = (v: PolicyViolation | null) => {
    if (v) violations.push(v);
  };

  if (policy === null || typeof policy !== "object") {
    return [
      { code: "MALFORMED_POLICY", message: "Policy is missing or not an object." },
    ];
  }

  push(badPercent(policy.maxAllocationPercent, "maxAllocationPercent"));
  if (policy.maxAllocationPercent === undefined) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: "maxAllocationPercent is required.",
    });
  }
  push(badPercent(policy.maxTotalExposurePercent, "maxTotalExposurePercent"));
  push(badPercent(policy.maxDailyDeployedPercent, "maxDailyDeployedPercent"));

  if (!RISK_LEVELS.includes(policy.maxRisk)) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `maxRisk must be one of ${RISK_LEVELS.join(", ")}, got ${String(policy.maxRisk)}.`,
    });
  }

  if (!LIQUIDITY_LEVELS.includes(policy.minLiquidity)) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `minLiquidity must be one of ${LIQUIDITY_LEVELS.join(", ")}, got ${String(policy.minLiquidity)}.`,
    });
  }

  if (typeof policy.leverageAllowed !== "boolean") {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `leverageAllowed must be a boolean, got ${typeof policy.leverageAllowed}.`,
    });
  }

  if (typeof policy.autoExecute !== "boolean") {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `autoExecute must be a boolean, got ${typeof policy.autoExecute}.`,
    });
  }

  if (
    policy.minReserveAtomic !== undefined &&
    (typeof policy.minReserveAtomic !== "bigint" || policy.minReserveAtomic < 0n)
  ) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `minReserveAtomic must be a non-negative bigint, got ${String(policy.minReserveAtomic)}.`,
    });
  }

  if (
    policy.maxActionsPerDay !== undefined &&
    (!Number.isInteger(policy.maxActionsPerDay) || policy.maxActionsPerDay < 0)
  ) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `maxActionsPerDay must be a non-negative integer, got ${String(policy.maxActionsPerDay)}.`,
    });
  }

  if (
    policy.cooldownSeconds !== undefined &&
    (!Number.isFinite(policy.cooldownSeconds) || policy.cooldownSeconds < 0)
  ) {
    violations.push({
      code: "MALFORMED_POLICY",
      message: `cooldownSeconds must be a non-negative number, got ${String(policy.cooldownSeconds)}.`,
    });
  }

  for (const [field, list] of [
    ["allowedProtocols", policy.allowedProtocols],
    ["blockedProtocols", policy.blockedProtocols],
  ] as const) {
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.some((p) => typeof p !== "string")) {
      violations.push({
        code: "MALFORMED_POLICY",
        message: `${field} must be an array of strings when present.`,
      });
    }
  }

  return violations;
}

/**
 * Validates the action's own structure.
 *
 * @param action - The action to check.
 * @returns Violations found. Empty means structurally sound.
 */
function validateAction(action: CanonicalAction): PolicyViolation[] {
  if (action === null || typeof action !== "object") {
    return [
      { code: "MALFORMED_ACTION", message: "Action is missing or not an object." },
    ];
  }

  const violations: PolicyViolation[] = [];

  if (typeof action.amountAtomic !== "bigint") {
    violations.push({
      code: "MALFORMED_ACTION",
      message:
        `amountAtomic must be a bigint, got ${typeof action.amountAtomic}. ` +
        `Amounts are never floats — float rounding is not an acceptable ` +
        `failure mode for a financial constraint.`,
    });
  }

  if (typeof action.walletBalanceAtomic !== "bigint") {
    violations.push({
      code: "MALFORMED_ACTION",
      message: `walletBalanceAtomic must be a bigint, got ${typeof action.walletBalanceAtomic}.`,
    });
  }

  if (typeof action.protocol !== "string" || action.protocol.trim() === "") {
    violations.push({
      code: "MALFORMED_ACTION",
      message: `protocol must be a non-empty string, got ${String(action.protocol)}.`,
    });
  }

  if (!RISK_LEVELS.includes(action.risk)) {
    violations.push({
      code: "MALFORMED_ACTION",
      message: `risk must be one of ${RISK_LEVELS.join(", ")}, got ${String(action.risk)}.`,
    });
  }

  if (!LIQUIDITY_LEVELS.includes(action.liquidity)) {
    violations.push({
      code: "MALFORMED_ACTION",
      message: `liquidity must be one of ${LIQUIDITY_LEVELS.join(", ")}, got ${String(action.liquidity)}.`,
    });
  }

  if (typeof action.usesLeverage !== "boolean") {
    violations.push({
      code: "MALFORMED_ACTION",
      message: `usesLeverage must be a boolean, got ${typeof action.usesLeverage}.`,
    });
  }

  return violations;
}

/** Which optional constraints cannot be judged without an EvaluationContext. */
function contextDependentConstraints(policy: RiskPolicy): string[] {
  const needs: string[] = [];
  if (policy.maxTotalExposurePercent !== undefined) needs.push("maxTotalExposurePercent");
  if (policy.maxActionsPerDay !== undefined) needs.push("maxActionsPerDay");
  if (policy.maxDailyDeployedPercent !== undefined) needs.push("maxDailyDeployedPercent");
  if (policy.cooldownSeconds !== undefined) needs.push("cooldownSeconds");
  return needs;
}

/**
 * Validates the context.
 *
 * A history row with an unreadable timestamp is fatal, not skippable. If we
 * cannot tell whether a past action falls inside the 24-hour window, we cannot
 * tell whether the daily cap is satisfied — and quietly dropping the row would
 * hide spending from the very limit meant to bound it.
 *
 * @param context - The context to check.
 * @returns Violations found.
 */
function validateContext(context: EvaluationContext): PolicyViolation[] {
  if (context === null || typeof context !== "object") {
    return [
      { code: "MALFORMED_CONTEXT", message: "Context is missing or not an object." },
    ];
  }

  const violations: PolicyViolation[] = [];

  if (
    !(context.now instanceof Date) ||
    Number.isNaN(context.now.getTime())
  ) {
    violations.push({
      code: "MALFORMED_CONTEXT",
      message: "context.now must be a valid Date.",
    });
  }

  if (typeof context.openExposureAtomic !== "bigint" || context.openExposureAtomic < 0n) {
    violations.push({
      code: "MALFORMED_CONTEXT",
      message: `context.openExposureAtomic must be a non-negative bigint, got ${String(context.openExposureAtomic)}.`,
    });
  }

  if (!Array.isArray(context.recentActions)) {
    violations.push({
      code: "MALFORMED_CONTEXT",
      message: "context.recentActions must be an array.",
    });
    return violations;
  }

  for (const [i, a] of context.recentActions.entries()) {
    if (a === null || typeof a !== "object") {
      violations.push({
        code: "MALFORMED_CONTEXT",
        message: `recentActions[${i}] is not an object.`,
      });
      continue;
    }
    if (typeof a.amountAtomic !== "bigint" || a.amountAtomic < 0n) {
      violations.push({
        code: "MALFORMED_CONTEXT",
        message: `recentActions[${i}].amountAtomic must be a non-negative bigint.`,
      });
    }
    const t = Date.parse(a.at);
    if (Number.isNaN(t)) {
      violations.push({
        code: "MALFORMED_CONTEXT",
        message:
          `recentActions[${i}].at is not a readable timestamp (${String(a.at)}). ` +
          `Refusing to evaluate time-based limits against an unreadable ` +
          `history rather than silently ignoring the row.`,
      });
    }
  }

  return violations;
}

/**
 * Evaluates an action against a policy.
 *
 * Never throws. Returns REJECTED with at least one violation whenever the
 * action is not demonstrably within every constraint.
 *
 * @param action - The canonical action, built from stored records and the
 *   real on-chain balance. Never from a model response.
 * @param policy - The user's standing constraints.
 * @param context - Time and history. Required when the policy configures any
 *   cumulative or temporal limit; omitting it then is a rejection.
 * @returns The verdict, listing every constraint that failed.
 */
export function evaluate(
  action: CanonicalAction,
  policy: RiskPolicy,
  context?: EvaluationContext,
): PolicyVerdict {
  const evaluated: string[] = [];

  const reject = (
    violations: PolicyViolation[],
    allocationBps: number | null = null,
  ): PolicyVerdict => ({
    decision: "REJECTED",
    requiresManualApproval: false,
    violations,
    allocationBps,
    evaluated,
  });

  try {
    const structural = [...validatePolicy(policy), ...validateAction(action)];

    // Structural problems stop evaluation. Comparing risk bands when the
    // bands are garbage would produce a meaningless pass.
    if (structural.length > 0) return reject(structural);

    const needsContext = contextDependentConstraints(policy);
    if (needsContext.length > 0 && context === undefined) {
      return reject([
        {
          code: "CONTEXT_REQUIRED",
          message:
            `This policy configures ${needsContext.join(", ")}, which cannot ` +
            `be evaluated without an EvaluationContext. Refusing rather than ` +
            `silently skipping the limit.`,
        },
      ]);
    }

    if (context !== undefined) {
      const contextProblems = validateContext(context);
      if (contextProblems.length > 0) return reject(contextProblems);
    }

    const violations: PolicyViolation[] = [];
    const amount = action.amountAtomic;
    const balance = action.walletBalanceAtomic;

    // ─── Chain ──────────────────────────────────────────────────────────
    evaluated.push("chain");
    if (action.chainId !== BASE_SEPOLIA_CHAIN_ID) {
      violations.push({
        code: "UNSUPPORTED_CHAIN",
        message:
          `Action targets chain ${action.chainId}. This agent operates only ` +
          `on Base Sepolia (${BASE_SEPOLIA_CHAIN_ID}).`,
      });
    }

    // ─── Amount sanity ──────────────────────────────────────────────────
    evaluated.push("amount");
    if (amount <= 0n) {
      violations.push({
        code: "NON_POSITIVE_AMOUNT",
        message: `Amount must be greater than zero, got ${amount.toString()}.`,
      });
    }

    if (balance < 0n) {
      violations.push({
        code: "MALFORMED_ACTION",
        message: `Wallet balance cannot be negative, got ${balance.toString()}.`,
      });
    }

    if (balance === 0n) {
      violations.push({
        code: "ZERO_BALANCE",
        message:
          `Wallet balance is zero, so no allocation percentage is defined. ` +
          `Refusing to act.`,
      });
    }

    if (amount > balance && balance > 0n) {
      violations.push({
        code: "INSUFFICIENT_BALANCE",
        message:
          `Amount ${amount.toString()} exceeds wallet balance ${balance.toString()}.`,
      });
    }

    // ─── Per-action allocation cap ──────────────────────────────────────
    evaluated.push("maxAllocationPercent");
    let allocationBps: number | null = null;
    if (balance > 0n && amount >= 0n) {
      allocationBps = Number((amount * 10_000n) / balance);
      if (amount * 100n > BigInt(policy.maxAllocationPercent) * balance) {
        violations.push({
          code: "ALLOCATION_EXCEEDS_CAP",
          message:
            `Allocation of ${(allocationBps / 100).toFixed(2)}% exceeds the ` +
            `policy cap of ${policy.maxAllocationPercent}%.`,
        });
      }
    }

    // ─── Risk / liquidity / leverage ────────────────────────────────────
    evaluated.push("maxRisk", "minLiquidity", "leverageAllowed");

    if (riskRank(action.risk) > riskRank(policy.maxRisk)) {
      violations.push({
        code: "RISK_ABOVE_MAX",
        message: `Opportunity risk ${action.risk} exceeds the policy maximum of ${policy.maxRisk}.`,
      });
    }

    if (liquidityRank(action.liquidity) < liquidityRank(policy.minLiquidity)) {
      violations.push({
        code: "LIQUIDITY_BELOW_MIN",
        message: `Opportunity liquidity ${action.liquidity} is below the policy minimum of ${policy.minLiquidity}.`,
      });
    }

    if (action.usesLeverage && !policy.leverageAllowed) {
      violations.push({
        code: "LEVERAGE_NOT_ALLOWED",
        message: `Action uses leverage and the policy sets leverageAllowed to false.`,
      });
    }

    // ─── Protocol allow / block lists ───────────────────────────────────
    if (policy.blockedProtocols !== undefined) {
      evaluated.push("blockedProtocols");
      if (policy.blockedProtocols.includes(action.protocol)) {
        violations.push({
          code: "PROTOCOL_BLOCKED",
          message: `Protocol "${action.protocol}" is on the policy blocklist.`,
        });
      }
    }

    if (policy.allowedProtocols !== undefined) {
      evaluated.push("allowedProtocols");
      if (!policy.allowedProtocols.includes(action.protocol)) {
        violations.push({
          code: "PROTOCOL_NOT_ALLOWED",
          message:
            `Protocol "${action.protocol}" is not on the policy allowlist ` +
            `(${policy.allowedProtocols.length === 0 ? "which is empty" : policy.allowedProtocols.join(", ")}).`,
        });
      }
    }

    // ─── Reserve floor ──────────────────────────────────────────────────
    if (policy.minReserveAtomic !== undefined) {
      evaluated.push("minReserveAtomic");
      const remaining = balance - amount;
      if (remaining < policy.minReserveAtomic) {
        violations.push({
          code: "RESERVE_BREACHED",
          message:
            `This action would leave ${remaining.toString()} atomic units, ` +
            `below the required reserve of ${policy.minReserveAtomic.toString()}.`,
        });
      }
    }

    // ─── Cumulative and temporal limits ─────────────────────────────────
    if (context !== undefined) {
      const nowMs = context.now.getTime();
      const windowStart = nowMs - DAY_MS;
      const inWindow = context.recentActions.filter(
        (a) => Date.parse(a.at) > windowStart && Date.parse(a.at) <= nowMs,
      );

      if (policy.maxTotalExposurePercent !== undefined && balance > 0n) {
        evaluated.push("maxTotalExposurePercent");
        const total = context.openExposureAtomic + amount;
        if (total * 100n > BigInt(policy.maxTotalExposurePercent) * balance) {
          const bps = Number((total * 10_000n) / balance);
          violations.push({
            code: "TOTAL_EXPOSURE_EXCEEDED",
            message:
              `Total exposure would reach ${(bps / 100).toFixed(2)}% of balance ` +
              `(${context.openExposureAtomic.toString()} already deployed plus ` +
              `${amount.toString()}), above the ${policy.maxTotalExposurePercent}% cap.`,
          });
        }
      }

      if (policy.maxActionsPerDay !== undefined) {
        evaluated.push("maxActionsPerDay");
        if (inWindow.length >= policy.maxActionsPerDay) {
          violations.push({
            code: "DAILY_ACTION_LIMIT_REACHED",
            message:
              `${inWindow.length} action(s) already executed in the last 24 ` +
              `hours, at the limit of ${policy.maxActionsPerDay}.`,
          });
        }
      }

      if (policy.maxDailyDeployedPercent !== undefined && balance > 0n) {
        evaluated.push("maxDailyDeployedPercent");
        const deployed = inWindow.reduce((sum, a) => sum + a.amountAtomic, 0n);
        const projected = deployed + amount;
        if (projected * 100n > BigInt(policy.maxDailyDeployedPercent) * balance) {
          const bps = Number((projected * 10_000n) / balance);
          violations.push({
            code: "DAILY_DEPLOY_CAP_EXCEEDED",
            message:
              `Deploying ${amount.toString()} would bring the rolling 24-hour ` +
              `total to ${(bps / 100).toFixed(2)}% of balance, above the ` +
              `${policy.maxDailyDeployedPercent}% daily cap.`,
          });
        }
      }

      if (policy.cooldownSeconds !== undefined && policy.cooldownSeconds > 0) {
        evaluated.push("cooldownSeconds");
        const lastMs = context.recentActions.reduce((latest, a) => {
          const t = Date.parse(a.at);
          return t > latest && t <= nowMs ? t : latest;
        }, Number.NEGATIVE_INFINITY);

        if (Number.isFinite(lastMs)) {
          const elapsed = (nowMs - lastMs) / 1000;
          if (elapsed < policy.cooldownSeconds) {
            violations.push({
              code: "COOLDOWN_ACTIVE",
              message:
                `Only ${elapsed.toFixed(0)}s since the last action; the policy ` +
                `requires ${policy.cooldownSeconds}s between actions. ` +
                `${(policy.cooldownSeconds - elapsed).toFixed(0)}s remaining.`,
            });
          }
        }
      }
    }

    if (violations.length > 0) return reject(violations, allocationBps);

    return {
      decision: "APPROVED",
      requiresManualApproval: !policy.autoExecute,
      violations: [],
      allocationBps,
      evaluated,
    };
  } catch (error) {
    // Nothing above should throw. If something does, that is itself a reason
    // to refuse — never to let an exception bubble somewhere it might be
    // caught and read as absence of objection.
    return reject([
      {
        code: "MALFORMED_ACTION",
        message: `Policy evaluation failed unexpectedly: ${String(error)}. Failing closed.`,
      },
    ]);
  }
}
