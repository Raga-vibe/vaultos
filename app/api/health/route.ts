/**
 * Wallet smoke endpoint.
 *
 * Next 16 defaults to the Node runtime and deprecates Edge, but the runtime
 * is declared explicitly anyway: the CDP SDKs are CommonJS with native
 * dependencies and will not run on Edge, so an implicit default is not
 * something to rely on.
 */

import { NextResponse } from "next/server";
import { getWalletSnapshot } from "../../../lib/agentkit/wallet";
import { findPublicCredentialLeaks } from "../../../lib/server-guard";
import { BASE_SEPOLIA_CHAIN_ID } from "../../../lib/policy/types";
import { getStore } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const leaks = findPublicCredentialLeaks();
  if (leaks.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Credential names are exposed via NEXT_PUBLIC_ variables: " +
          leaks.join(", "),
      },
      { status: 500 },
    );
  }

  try {
    const snapshot = await getWalletSnapshot();
    const onExpectedChain =
      snapshot.chainId === String(BASE_SEPOLIA_CHAIN_ID);

    return NextResponse.json({
      ok: true,
      wallet: snapshot,
      expectedChainId: BASE_SEPOLIA_CHAIN_ID,
      onExpectedChain,
      // Reported so nobody has to guess which database they are writing to.
      store: getStore().kind,
      depositAddressConfigured: Boolean(
        process.env.OPPORTUNITY_DEPOSIT_ADDRESS?.trim(),
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
