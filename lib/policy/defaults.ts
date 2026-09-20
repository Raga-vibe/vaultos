/**
 * The starting policy.
 *
 * Used when no policy has been stored yet. Chosen to be restrictive: a user
 * who never opens the settings should end up with a cautious agent, not a
 * permissive one. autoExecute is false, so nothing moves without a human
 * saying so until the user deliberately changes that.
 */

import type { RiskPolicy } from "./types";

/** A deliberately conservative default. */
export const DEFAULT_POLICY: RiskPolicy = {
  maxAllocationPercent: 20,
  maxRisk: "MEDIUM",
  minLiquidity: "MEDIUM",
  leverageAllowed: false,
  autoExecute: false,

  maxTotalExposurePercent: 50,
  maxActionsPerDay: 5,
  maxDailyDeployedPercent: 40,
  cooldownSeconds: 300,
};
