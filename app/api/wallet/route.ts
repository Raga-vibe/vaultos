/** Wallet snapshot. Public chain data only — no credentials in the response. */
import { getWalletSnapshot } from "../../../lib/agentkit/wallet";
import { getTokenBalanceAtomic } from "../../../lib/agentkit/execute";
import { BASE_SEPOLIA_USDC, USDC_DECIMALS } from "../../../lib/opportunities/source";
import { ok, serverError } from "../../../lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [snapshot, usdc] = await Promise.all([
      getWalletSnapshot(),
      getTokenBalanceAtomic(BASE_SEPOLIA_USDC),
    ]);
    return ok({
      wallet: snapshot,
      usdc: { atomic: usdc, decimals: USDC_DECIMALS, address: BASE_SEPOLIA_USDC },
    });
  } catch (error) {
    return serverError(error, "Could not read the wallet");
  }
}
