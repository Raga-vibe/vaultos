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

/**
 * LITE MODE — `GET /api/health?lite=1`
 *
 * The full check resolves the CDP wallet, which is the most expensive thing
 * this application does: measured at six to seven seconds, and on a platform
 * that gives every request a cold function, no in-process cache helps.
 *
 * Four separate surfaces were paying that cost to read a single cheap field.
 * Three of them only wanted `store`, to decide whether to warn that this
 * deployment has no database; one only wanted `depositAddressConfigured`.
 * None of them looked at the wallet at all.
 *
 * Lite mode answers exactly those questions and skips the wallet entirely.
 * It only ever returns LESS than the full check — never more — so it cannot
 * widen what this endpoint exposes. The full response is unchanged, and
 * System status still uses it, because proving the wallet resolves is the
 * reason this endpoint exists.
 *
 * This is diagnostics. Nothing here is an authorization input, in either mode.
 */
function liteHealth() {
  return NextResponse.json({
    ok: true,
    lite: true,
    runtime: runtimeInfo(),
    expectedChainId: BASE_SEPOLIA_CHAIN_ID,
    store: getStore().kind,
    depositAddressConfigured: Boolean(
      process.env.OPPORTUNITY_DEPOSIT_ADDRESS?.trim(),
    ),
    rpcConfigured: Boolean(process.env.RPC_URL?.trim()),
  });
}

export async function GET(request: Request) {
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

  if (new URL(request.url).searchParams.get("lite") === "1") {
    return liteHealth();
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
      // A boolean, never the URL. A dedicated endpoint is the difference
      // between a seven-second chain read and a fast one, and "did the env
      // var actually land on this deployment" is otherwise unanswerable
      // without reading the dashboard.
      rpcConfigured: Boolean(process.env.RPC_URL?.trim()),
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
