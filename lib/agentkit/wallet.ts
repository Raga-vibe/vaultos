/**
 * Wallet resolution.
 *
 * THE BUG THIS MODULE EXISTS TO PREVENT
 *
 * CdpEvmWalletProvider.configureWithWallet() creates a brand new wallet when
 * called without an `address`. Verified in the installed package's compiled
 * source (dist/wallet-providers/cdpEvmWalletProvider.js):
 *
 *     const serverAccount = await (config.address
 *         ? cdpClient.evm.getAccount({ address: config.address })
 *         : cdpClient.evm.createAccount({ idempotencyKey }));
 *
 * So the naive call produces a fresh, empty wallet on every hot reload and
 * every serverless cold start. Funds go to an address the next request will
 * not know about.
 *
 * THE FIX, in two parts
 *
 *   1. Resolve a stable named account first, with
 *      cdp.evm.getOrCreateAccount({ name }), and pass its address in. Named
 *      accounts are idempotent server-side: the same name always returns the
 *      same address.
 *   2. Memoise the provider on globalThis, so Next's dev-mode module
 *      reloading does not re-enter the CDP round trip on every request.
 *
 * `npm run spike:wallet` is the regression test: it resolves twice and fails
 * if the two addresses differ.
 */

import type { CdpEvmWalletProvider } from "@coinbase/agentkit";
import type { CdpClient } from "@coinbase/cdp-sdk";
import { assertServer, optionalEnv, requireEnv } from "../server-guard";
import { nodeSupportsRequireEsm, REQUIRE_ESM_MINIMUMS } from "../runtime-info";
import { installAnalyticsCrashGuard } from "./analytics-guard";

assertServer("lib/agentkit/wallet.ts");

// AgentKit fires an unawaited telemetry ping when a WalletProvider is
// constructed; if it fails, the unhandled rejection kills the process. Install
// the guard before anything can construct one.
installAnalyticsCrashGuard();

/** Networks the CDP faucet serves. */
export type FaucetNetwork = "base-sepolia" | "ethereum-sepolia";

/** Tokens the CDP faucet dispenses. */
export type FaucetToken = "eth" | "usdc" | "eurc" | "cbbtc";

/**
 * Loads the Coinbase SDKs at call time rather than at module load.
 *
 * WHY THIS IS NOT A STATIC IMPORT
 *
 * A top-level `import` that fails is uncatchable. The module never finishes
 * evaluating, the route handler never exists, and a serverless platform
 * answers with an empty 500 carrying no content-type and no clue — no code
 * of ours runs, so no error of ours can be reported.
 *
 * That is exactly what happened on the first deployment: every route touching
 * these packages returned a blank 500 in under 400ms, faster than the routes
 * that succeeded, because it was dying before it could do any work.
 *
 * AgentKit resolves to roughly 1,270 packages including native binaries, and
 * `serverExternalPackages` keeps it out of the bundle, so it has to be traced
 * into the deployment as real files. When that tracing misses something, the
 * require fails at runtime on the host and nowhere else.
 *
 * Importing inside a function turns that into an ordinary rejected promise:
 * catchable, reportable, and visible in the interface with the name of the
 * module that actually failed.
 *
 * @returns The two SDK entry points.
 * @throws An error naming the module that could not be loaded.
 */
async function loadCoinbaseSdks(): Promise<{
  CdpEvmWalletProvider: typeof import("@coinbase/agentkit").CdpEvmWalletProvider;
  CdpClient: typeof import("@coinbase/cdp-sdk").CdpClient;
}> {
  try {
    const [agentkit, cdpSdk] = await Promise.all([
      import("@coinbase/agentkit"),
      import("@coinbase/cdp-sdk"),
    ]);
    return {
      CdpEvmWalletProvider: agentkit.CdpEvmWalletProvider,
      CdpClient: cdpSdk.CdpClient,
    };
  } catch (error) {
    // The single most common cause is an outdated Node on the host: the CDP
    // SDK's CommonJS build requires jose, which is ESM-only. Saying so here
    // turns a bare ERR_REQUIRE_ESM into an instruction.
    const version = process.version;
    const cause = nodeSupportsRequireEsm()
      ? `This Node (${version}) can require an ES module, so the likely cause ` +
        `is a missing file: these packages are declared in ` +
        `serverExternalPackages, so they are not bundled and must be traced ` +
        `into the deployment as real modules.`
      : `This host is running Node ${version}, which cannot require() an ES ` +
        `module. @coinbase/cdp-sdk's CommonJS build requires jose, which is ` +
        `ESM-only, so it cannot load at all here. Node ${REQUIRE_ESM_MINIMUMS} ` +
        `is required.`;

    throw new Error(
      `Could not load the Coinbase SDKs at runtime. ${cause} ` +
        `Underlying error: ${String(error)}`,
    );
  }
}

type WalletCache = {
  provider: Promise<CdpEvmWalletProvider> | null;
  cdp: CdpClient | null;
};

const CACHE_KEY = Symbol.for("agentvault.wallet.cache");

/**
 * Reads the process-wide cache.
 *
 * Keyed on globalThis with a registered symbol so it survives the module
 * re-evaluation that Next's dev server performs on every edit.
 *
 * @returns The cache object, created on first use.
 */
function cache(): WalletCache {
  const g = globalThis as unknown as Record<symbol, WalletCache | undefined>;
  if (!g[CACHE_KEY]) {
    g[CACHE_KEY] = { provider: null, cdp: null };
  }
  return g[CACHE_KEY];
}

/**
 * Returns the CDP client, constructing it once.
 *
 * @returns The CdpClient.
 */
export async function getCdpClient(): Promise<CdpClient> {
  const c = cache();
  if (c.cdp) return c.cdp;

  const { CdpClient } = await loadCoinbaseSdks();

  c.cdp = new CdpClient({
    apiKeyId: requireEnv("CDP_API_KEY_ID"),
    apiKeySecret: requireEnv("CDP_API_KEY_SECRET"),
    walletSecret: requireEnv("CDP_WALLET_SECRET"),
  });

  return c.cdp;
}

/**
 * Resolves the agent's wallet provider, stably.
 *
 * Safe to call repeatedly. The underlying CDP work happens once per process;
 * every later call returns the same provider and therefore the same address.
 *
 * @returns The memoised wallet provider.
 */
export function getWalletProvider(): Promise<CdpEvmWalletProvider> {
  const c = cache();
  if (c.provider) return c.provider;

  c.provider = (async () => {
    const { CdpEvmWalletProvider } = await loadCoinbaseSdks();
    const cdp = await getCdpClient();
    const name = optionalEnv("AGENT_WALLET_NAME", "agentvault-agent");
    const networkId = optionalEnv("NETWORK_ID", "base-sepolia");

    // Step 1: resolve the stable named account BEFORE touching the provider.
    const account = await cdp.evm.getOrCreateAccount({ name });

    // Step 2: hand its address to configureWithWallet, so the provider takes
    // the getAccount branch rather than the createAccount branch.
    const provider = await CdpEvmWalletProvider.configureWithWallet({
      address: account.address,
      networkId,
      apiKeyId: requireEnv("CDP_API_KEY_ID"),
      apiKeySecret: requireEnv("CDP_API_KEY_SECRET"),
      walletSecret: requireEnv("CDP_WALLET_SECRET"),
      rpcUrl: process.env.RPC_URL?.trim() || undefined,
    });

    return provider;
  })();

  // A failed resolution must not be cached, or the process is poisoned until
  // it restarts.
  c.provider.catch(() => {
    cache().provider = null;
  });

  return c.provider;
}

/** A point-in-time view of the wallet, safe to log and to return to a client. */
export type WalletSnapshot = {
  address: string;
  networkId: string | undefined;
  chainId: string | undefined;
  protocolFamily: string;
  /** Native balance in wei. */
  nativeBalanceWei: string;
};

/**
 * Takes a snapshot of the wallet.
 *
 * Contains no credentials — every field is public chain data.
 *
 * @returns The snapshot.
 */
export async function getWalletSnapshot(): Promise<WalletSnapshot> {
  const provider = await getWalletProvider();
  const network = provider.getNetwork();
  const balance = await provider.getBalance();

  return {
    address: provider.getAddress(),
    networkId: network.networkId,
    chainId: network.chainId,
    protocolFamily: network.protocolFamily,
    nativeBalanceWei: balance.toString(),
  };
}

/**
 * Requests testnet funds.
 *
 * @param token - Token to request.
 * @param network - Faucet network. Defaults to base-sepolia.
 * @returns The faucet transaction hash.
 */
export async function requestFaucet(
  token: FaucetToken,
  network: FaucetNetwork = "base-sepolia",
): Promise<string> {
  const cdp = await getCdpClient();
  const provider = await getWalletProvider();

  const result = await cdp.evm.requestFaucet({
    address: provider.getAddress(),
    network,
    token,
  });

  return result.transactionHash;
}

/**
 * Clears the memoised provider.
 *
 * For tests and spikes that need a cold resolution. Not used in request paths.
 */
export function resetWalletCache(): void {
  const c = cache();
  c.provider = null;
  c.cdp = null;
}
