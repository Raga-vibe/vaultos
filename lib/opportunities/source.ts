/**
 * Opportunity records.
 *
 * ON THE HONESTY OF THIS DATA
 *
 * Base Sepolia is a testnet. There are no real lending markets on it and no
 * real yields. Every record below is a FIXTURE — invented data, deliberately
 * shaped to exercise a different policy rule. Each one carries
 * `dataSource: "SEEDED"` so nothing downstream can mistake it for a live
 * market feed, and the protocol names are plainly generic so no real
 * organisation's name is attached to numbers it did not publish.
 *
 * What is NOT fake: the token addresses, the chain, the balances read against
 * them, and any transaction that results. The fixtures describe what the agent
 * is deciding about; the decision and its consequences are real.
 *
 * WHY THESE SPECIFIC FIXTURES
 *
 * The set is chosen so that a single pass over it makes the policy engine
 * visibly do different things — one opportunity trips the risk ceiling,
 * another the liquidity floor, another the leverage ban. A demo where
 * everything is approved demonstrates nothing.
 *
 * The risk band, liquidity band and leverage flag here are the values the
 * policy engine judges. They are set by us. They are not read from a SERV
 * assessment, and a SERV assessment that disagrees does not change them.
 */

import type {
  CanonicalAction,
  LiquidityLevel,
  RiskLevel,
} from "../policy/types";
import { BASE_SEPOLIA_CHAIN_ID } from "../policy/types";

/** Base Sepolia token addresses, from @coinbase/agentkit's own constants. */
export const BASE_SEPOLIA_USDC =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const BASE_SEPOLIA_EURC =
  "0x808456652fdb597867f38412077A9182bf77359F" as const;
export const BASE_SEPOLIA_WETH =
  "0x4200000000000000000000000000000000000006" as const;

/** USDC and EURC both use six decimals; WETH uses eighteen. */
export const USDC_DECIMALS = 6;
export const EURC_DECIMALS = 6;
export const WETH_DECIMALS = 18;

/**
 * Where a record's facts came from.
 *
 * Only SEEDED exists today. The field is here so that the day a live feed is
 * added, every consumer is already forced to acknowledge the difference
 * rather than discovering it by surprise.
 */
export type DataSource = "SEEDED";

/** A yield opportunity the agent may be asked to assess. */
export type Opportunity = {
  id: string;
  name: string;
  protocol: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  tokenDecimals: number;
  /** Estimated APY in basis points. 500 = 5.00%. Fixture data. */
  estimatedApyBps: number;
  /** Our recorded risk band. Trusted input to the policy engine. */
  risk: RiskLevel;
  /** Our recorded liquidity band. Trusted input to the policy engine. */
  liquidity: LiquidityLevel;
  /** Whether the strategy involves leverage. Trusted input. */
  usesLeverage: boolean;
  description: string;
  /** Provenance. Never omitted, never inferred. */
  dataSource: DataSource;
  /**
   * Which policy rule this fixture is here to exercise. Documentation, not
   * logic — the engine never reads it.
   */
  demonstrates: string;
  /**
   * Where funds are sent to enter this position.
   *
   * The fixtures have no real pool behind them, so this resolves to
   * OPPORTUNITY_DEPOSIT_ADDRESS from the environment. The transfer that
   * results is a REAL on-chain transaction to a REAL address — a placeholder
   * destination, not a simulated execution. No code path in this repo reports
   * a transfer as successful without a transaction hash from the chain.
   *
   * Null when unconfigured, in which case execution refuses rather than
   * guessing a destination.
   */
  depositAddress: `0x${string}` | null;
};

/**
 * Reads the configured deposit destination.
 *
 * No default. A wrong default in a file that moves money is precisely the kind
 * of convenience that costs someone their funds.
 *
 * @returns The address, or null when unset or malformed.
 */
function depositAddress(): `0x${string}` | null {
  const raw = process.env.OPPORTUNITY_DEPOSIT_ADDRESS?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as `0x${string}`;
}

/** The seeded set. Each entry exercises a different rule. */
const SEEDED: Omit<Opportunity, "depositAddress">[] = [
  {
    id: "opp-stable-reserve",
    name: "Stablecoin reserve position",
    protocol: "Testnet Stable Reserve",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenDecimals: USDC_DECIMALS,
    estimatedApyBps: 412,
    risk: "LOW",
    liquidity: "HIGH",
    usesLeverage: false,
    description:
      "Supply USDC to a conservative reserve. Unleveraged, withdrawable on " +
      "demand, denominated in a stablecoin.",
    dataSource: "SEEDED",
    demonstrates: "The baseline: passes every rule in the default policy.",
  },
  {
    id: "opp-balanced-pool",
    name: "Balanced lending pool",
    protocol: "Testnet Balanced Pool",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenDecimals: USDC_DECIMALS,
    estimatedApyBps: 780,
    risk: "MEDIUM",
    liquidity: "MEDIUM",
    usesLeverage: false,
    description:
      "A lending pool with moderate utilisation. Higher yield than the " +
      "reserve, with a withdrawal queue under stress.",
    dataSource: "SEEDED",
    demonstrates:
      "Sits exactly on the default ceilings — MEDIUM risk, MEDIUM liquidity.",
  },
  {
    id: "opp-volatile-strategy",
    name: "Volatile asset strategy",
    protocol: "Testnet Momentum Vault",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    // Denominated in USDC rather than WETH on purpose. The CDP faucet issues
    // eth, usdc, eurc and cbbtc — not WETH — so a WETH-denominated fixture
    // always evaluates against a zero balance, and ZERO_BALANCE then masks
    // the rule this fixture exists to demonstrate. The asset is incidental
    // here; the risk ceiling is the point.
    tokenSymbol: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenDecimals: USDC_DECIMALS,
    estimatedApyBps: 2450,
    risk: "HIGH",
    liquidity: "MEDIUM",
    usesLeverage: false,
    description:
      "A directional strategy on a volatile asset. Advertises a high yield " +
      "that is not compensation for a free lunch.",
    dataSource: "SEEDED",
    demonstrates: "Rejected by maxRisk under the default policy.",
  },
  {
    id: "opp-locked-vault",
    name: "Locked-term vault",
    protocol: "Testnet Term Vault",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenDecimals: USDC_DECIMALS,
    estimatedApyBps: 950,
    risk: "LOW",
    liquidity: "LOW",
    usesLeverage: false,
    description:
      "A fixed-term deposit. The credit risk is low; the money is simply not " +
      "retrievable until the term ends.",
    dataSource: "SEEDED",
    demonstrates:
      "Rejected by minLiquidity — shows that low risk alone is not enough.",
  },
  {
    id: "opp-leveraged-carry",
    name: "Leveraged carry trade",
    protocol: "Testnet Carry Desk",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenDecimals: USDC_DECIMALS,
    estimatedApyBps: 1840,
    risk: "MEDIUM",
    liquidity: "HIGH",
    usesLeverage: true,
    description:
      "Borrows against the deposit to amplify a yield spread. Liquid and " +
      "only moderately risky by its own accounting — and leveraged.",
    dataSource: "SEEDED",
    demonstrates:
      "Rejected by leverageAllowed. Passes every other rule, which is the " +
      "point: a single categorical ban is not a scoring system.",
  },
  {
    id: "opp-euro-reserve",
    name: "Euro stablecoin reserve",
    protocol: "Testnet Euro Desk",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    tokenSymbol: "EURC",
    tokenAddress: BASE_SEPOLIA_EURC,
    tokenDecimals: EURC_DECIMALS,
    estimatedApyBps: 305,
    risk: "LOW",
    liquidity: "HIGH",
    usesLeverage: false,
    description:
      "A euro-denominated equivalent of the stable reserve. Carries currency " +
      "risk for a dollar-based holder, which the risk band does not capture. " +
      "Fund it with: npm run spike:balance -- --faucet=eurc",
    dataSource: "SEEDED",
    demonstrates:
      "Passes policy while carrying a risk the bands do not model — useful " +
      "for showing where a deterministic engine needs human judgement.",
  },
];

/**
 * Lists available opportunities.
 *
 * @returns Copies, with the deposit address resolved.
 */
export function listOpportunities(): Opportunity[] {
  const to = depositAddress();
  return SEEDED.map((o) => ({ ...o, depositAddress: to }));
}

/**
 * Looks up one opportunity by id.
 *
 * @param id - The opportunity id.
 * @returns The record, or null when unknown.
 */
export function getOpportunity(id: string): Opportunity | null {
  const found = SEEDED.find((o) => o.id === id);
  return found ? { ...found, depositAddress: depositAddress() } : null;
}

/**
 * Builds the canonical action the policy engine will judge.
 *
 * This function is the security boundary named in the project brief. Every
 * field of the returned action comes from one of exactly two trusted sources:
 *
 *   - the stored Opportunity record, and
 *   - the real on-chain wallet balance passed in as a bigint.
 *
 * It deliberately accepts no Assessment parameter. There is no argument you
 * could pass that would let a model response influence the result, which is
 * what makes "an LLM never decides whether a hard constraint is satisfied" a
 * property of the code rather than a promise in a document.
 *
 * @param opportunity - The stored record.
 * @param amountAtomic - Amount to deploy, in the token's atomic units.
 * @param walletBalanceAtomic - Real on-chain balance, same units.
 * @returns The canonical action.
 */
export function buildCanonicalAction(
  opportunity: Opportunity,
  amountAtomic: bigint,
  walletBalanceAtomic: bigint,
): CanonicalAction {
  return {
    opportunityId: opportunity.id,
    protocol: opportunity.protocol,
    chainId: opportunity.chainId,
    tokenSymbol: opportunity.tokenSymbol,
    amountAtomic,
    walletBalanceAtomic,
    risk: opportunity.risk,
    liquidity: opportunity.liquidity,
    usesLeverage: opportunity.usesLeverage,
  };
}
