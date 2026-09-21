/** Wallet snapshot. Public chain data only — no credentials in the response. */
import { getWalletSnapshot } from "../../../lib/agentkit/wallet";
import { getTokenBalanceAtomic } from "../../../lib/agentkit/execute";
import { BASE_SEPOLIA_USDC, USDC_DECIMALS } from "../../../lib/opportunities/source";
import { ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A chain read behind this can be slow on the public Base Sepolia endpoint —
 * measured at six to seven seconds — so the ceiling is raised above the
 * platform default. This changes only how long we are willing to WAIT. A
 * timeout still produces a system error, never a verdict.
 */
export const maxDuration = 30;

export async function GET() {
  try {
    const [snapshot, usdc] = await Promise.all([
      getWalletSnapshot(),
      // Display only. A balance a few seconds old on a card is fine; the
      // execution path never reads through this cache.
      getTokenBalanceAtomic(BASE_SEPOLIA_USDC, 15_000),
    ]);
    return ok({
      wallet: snapshot,
      usdc: { atomic: usdc, decimals: USDC_DECIMALS, address: BASE_SEPOLIA_USDC },
    });
  } catch (error) {
    return serverError(error, "Could not read the wallet");
  }
}
