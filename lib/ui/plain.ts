/**
 * Plain language.
 *
 * Every technical term in this product has a precise name that matters —
 * LEVERAGE_NOT_ALLOWED is searchable in the source, reproducible in an audit,
 * and exactly what the engine emitted. That name is never replaced here.
 *
 * What this file adds is a sentence a person who has never touched crypto can
 * read. The interface shows the sentence first and keeps the code beside it,
 * because the two audiences are different and both are real: someone seeing
 * this for the first time needs to know what happened, and someone checking
 * the work needs to know exactly which rule fired.
 *
 * The voice is second person and concrete. "This borrows money to make a
 * bigger bet, and you said no to that" — not "leverage constraint violated".
 */

/** What a refusal means, in a sentence, from the user's point of view. */
const REFUSAL_PLAIN: Record<string, string> = {
  ALLOCATION_EXCEEDS_CAP:
    "This would put more money into one thing than you allow in a single move.",
  RISK_ABOVE_MAX: "This is riskier than you said you were willing to accept.",
  LIQUIDITY_BELOW_MIN:
    "Getting your money back out of this would be harder than you allow.",
  LEVERAGE_NOT_ALLOWED:
    "This borrows money to make a bigger bet. You told the agent never to do that.",
  UNSUPPORTED_CHAIN: "This is on the wrong network.",
  NON_POSITIVE_AMOUNT: "The amount has to be more than zero.",
  INSUFFICIENT_BALANCE: "There isn't that much in the wallet.",
  ZERO_BALANCE: "The wallet is empty, so there is nothing to invest.",
  TOTAL_EXPOSURE_EXCEEDED:
    "You already have a lot invested. This would push the total past your ceiling.",
  RESERVE_BREACHED:
    "You set aside money that must never be touched. This would dip into it.",
  DAILY_ACTION_LIMIT_REACHED:
    "The agent has already made all the moves you allow it in a day.",
  DAILY_DEPLOY_CAP_EXCEEDED:
    "This would take today's total above the most you let it invest in one day.",
  COOLDOWN_ACTIVE:
    "The agent acted recently. You asked it to wait a while between moves.",
  PROTOCOL_NOT_ALLOWED: "You only approved certain places, and this isn't one.",
  PROTOCOL_BLOCKED: "You banned this place specifically.",
  CONTEXT_REQUIRED:
    "One of your rules couldn't be checked, so the agent refused rather than guess.",
  MALFORMED_POLICY: "Your rules couldn't be read properly, so nothing was allowed.",
  MALFORMED_ACTION: "The request didn't make sense, so it was refused.",
  MALFORMED_CONTEXT:
    "The record of past moves couldn't be read, so the agent refused rather than guess.",
};

/**
 * A plain sentence explaining a refusal.
 *
 * @param code - The violation code.
 * @returns A sentence anyone can read.
 */
export function plainRefusal(code: string): string {
  return (
    REFUSAL_PLAIN[code] ??
    "One of the rules you set refused this, so nothing happened."
  );
}

/** What a risk band means without the jargon. */
export function plainRisk(band: string): string {
  return { LOW: "Low risk", MEDIUM: "Medium risk", HIGH: "High risk" }[band] ?? band;
}

/** What a liquidity band means to someone who wants their money back. */
export function plainLiquidity(band: string): string {
  return (
    {
      LOW: "Money gets locked up",
      MEDIUM: "Takes a while to withdraw",
      HIGH: "Withdraw any time",
    }[band] ?? band
  );
}

/** Each policy rule, named and described for a first-time reader. */
export const PLAIN_RULES: Record<
  string,
  { title: string; question: string; why: string }
> = {
  maxAllocationPercent: {
    title: "Biggest single move",
    question: "How much of your money can go into one thing at once?",
    why: "Stops everything landing on one bet.",
  },
  maxRisk: {
    title: "Riskiest thing allowed",
    question: "How risky may an investment be?",
    why: "Anything riskier is refused outright, however good it looks.",
  },
  minLiquidity: {
    title: "Getting your money out",
    question: "How easily must you be able to withdraw?",
    why: "A great return is no use if you cannot reach your money.",
  },
  leverageAllowed: {
    title: "Borrowing to invest",
    question: "May the agent borrow money to make bigger bets?",
    why: "Borrowing multiplies gains and losses alike. Off by default.",
  },
  autoExecute: {
    title: "Acting without asking",
    question: "May the agent move money on its own?",
    why: "When off, you confirm every single move yourself.",
  },
  maxTotalExposurePercent: {
    title: "Most invested at once",
    question: "Across everything, how much may be tied up?",
    why: "Many small allowed moves can still empty a wallet. This stops that.",
  },
  minReserveAtomic: {
    title: "Untouchable reserve",
    question: "How much must always stay in the wallet?",
    why: "A hard floor in money, not percentages — percentages never quite stop.",
  },
  maxActionsPerDay: {
    title: "Moves per day",
    question: "How many times may it act in 24 hours?",
    why: "Catches an agent that gets stuck repeating itself.",
  },
  maxDailyDeployedPercent: {
    title: "Spending limit per day",
    question: "How much may go out in a single day?",
    why: "However the agent splits it up, the daily total is capped.",
  },
  cooldownSeconds: {
    title: "Pause between moves",
    question: "How long must it wait after acting?",
    why: "Gives you time to notice and step in.",
  },
  allowedProtocols: {
    title: "Approved places only",
    question: "Which services may it use?",
    why: "If a list is set, anything not on it is refused.",
  },
  blockedProtocols: {
    title: "Banned places",
    question: "Which services must it never use?",
    why: "Always wins, even over the approved list.",
  },
};

/**
 * The policy field behind each violation code.
 *
 * Lets the interface answer "refused by what?" with the setting the user can
 * actually go and change, rather than only the code the engine emitted. Codes
 * that arise from the request or the chain rather than from a rule are absent
 * on purpose — there is no setting to point at for an empty wallet.
 */
export const RULE_FOR_CODE: Record<string, keyof typeof PLAIN_RULES> = {
  ALLOCATION_EXCEEDS_CAP: "maxAllocationPercent",
  RISK_ABOVE_MAX: "maxRisk",
  LIQUIDITY_BELOW_MIN: "minLiquidity",
  LEVERAGE_NOT_ALLOWED: "leverageAllowed",
  TOTAL_EXPOSURE_EXCEEDED: "maxTotalExposurePercent",
  RESERVE_BREACHED: "minReserveAtomic",
  DAILY_ACTION_LIMIT_REACHED: "maxActionsPerDay",
  DAILY_DEPLOY_CAP_EXCEEDED: "maxDailyDeployedPercent",
  COOLDOWN_ACTIVE: "cooldownSeconds",
  PROTOCOL_NOT_ALLOWED: "allowedProtocols",
  PROTOCOL_BLOCKED: "blockedProtocols",
};

/**
 * What a given opportunity is there to test.
 *
 * THE CONFUSION THIS EXISTS TO FIX
 *
 * "Opportunity" reads as an investment offering, so a first-time visitor
 * arrives looking for the best one — and there is no best one. These are six
 * proposed actions, and five of the six exist to make a specific rule fire.
 * The point of clicking is not to find a good return; it is to watch a
 * particular boundary do its job.
 *
 * Derived from the same three fields the engine reads, so it cannot drift
 * away from what actually happens. It names what is being TESTED, never the
 * outcome: a user who raised their risk ceiling to HIGH still has their risk
 * limit tested by the volatile strategy — it just passes.
 *
 * @param o - Risk, liquidity and leverage, as the engine sees them.
 * @returns A short label for what this case exercises.
 */
export function whatThisTests(o: {
  risk: string;
  liquidity: string;
  usesLeverage: boolean;
}): string {
  if (o.usesLeverage) return "Your leverage rule";
  if (o.risk === "HIGH") return "Your risk ceiling";
  if (o.liquidity === "LOW") return "Your liquidity floor";
  // Short enough to sit on one line beside the verdict pill.
  return "The everyday case";
}
