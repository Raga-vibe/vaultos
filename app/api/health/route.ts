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
import { runtimeInfo } from "../../../lib/runtime-info";

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
      // Reported on the success path too, so a working deployment records
      // which Node version it was working on.
      runtime: runtimeInfo(),
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
    // The runtime goes out on the failure path above all, because a failure
    // here is usually a failure to load a module, and the Node version is the
    // first thing anyone diagnosing that needs to know.
    return NextResponse.json(
      { ok: false, runtime: runtimeInfo(), error: String(error) },
      { status: 500 },
    );
  }
}
