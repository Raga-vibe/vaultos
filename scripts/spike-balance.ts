/**
 * Network spike: balance retrieval, and optional faucet funding.
 *
 *   npm run spike:balance
 *   npm run spike:balance -- --faucet        (requests ETH and USDC)
 *   npm run spike:balance -- --faucet=usdc   (one token only)
 *
 * Faucet funding is opt-in because the CDP faucet is rate limited and burning
 * a request on an accidental run is annoying.
 */

import {
  check,
  finish,
  heading,
  info,
  loadEnv,
  requireEnvOrFatal,
  value,
} from "./_report";
import { getWalletSnapshot, requestFaucet, type FaucetToken } from "../lib/agentkit/wallet";
import { describeNetworkError } from "./_report";
import { getNativeBalanceWei, getTokenBalanceAtomic } from "../lib/agentkit/execute";
import { BASE_SEPOLIA_USDC, USDC_DECIMALS } from "../lib/opportunities/source";

loadEnv();
heading("SPIKE: balances" );
requireEnvOrFatal([
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
]);

/**
 * Formats an atomic amount for display.
 *
 * @param atomic - The atomic amount.
 * @param decimals - Token decimals.
 * @returns A decimal string.
 */
function format(atomic: bigint, decimals: number): string {
  const negative = atomic < 0n;
  const abs = negative ? -atomic : atomic;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

const faucetArg = process.argv.find((a) => a.startsWith("--faucet"));
const requestedTokens: FaucetToken[] = !faucetArg
  ? []
  : faucetArg.includes("=")
    ? [faucetArg.split("=")[1] as FaucetToken]
    : ["eth", "usdc"];

let snapshot;
try {
  snapshot = await getWalletSnapshot();
} catch (error) {
  check(false, "reached the Coinbase API and resolved a wallet", describeNetworkError(error));
  finish();
}
value("address", snapshot.address);
value("network", snapshot.networkId ?? "(none)");

if (requestedTokens.length > 0) {
  for (const token of requestedTokens) {
    info(`requesting ${token} from the faucet…`);
    try {
      const hash = await requestFaucet(token, "base-sepolia");
      value(`faucet ${token} tx`, hash);
      check(/^0x[a-fA-F0-9]{64}$/.test(hash), `faucet returned a ${token} tx hash`, hash);
    } catch (error) {
      check(false, `faucet request for ${token} succeeded`, describeNetworkError(error));
    }
  }
  info("waiting 12s for faucet transactions to land…");
  await new Promise((r) => setTimeout(r, 12_000));
}

info("reading balances from chain…");

let nativeWei: bigint;
try {
  nativeWei = await getNativeBalanceWei();
  value("native (ETH)", `${format(nativeWei, 18)} ETH`);
  check(nativeWei >= 0n, "native balance retrieved");
} catch (error) {
  check(false, "native balance retrieved", describeNetworkError(error));
  finish();
}

let usdcAtomic: bigint;
try {
  usdcAtomic = await getTokenBalanceAtomic(BASE_SEPOLIA_USDC);
  value("USDC", `${format(usdcAtomic, USDC_DECIMALS)} USDC`);
  value("USDC (atomic)", usdcAtomic.toString());
  check(usdcAtomic >= 0n, "USDC balance retrieved via readContract");
} catch (error) {
  check(false, "USDC balance retrieved via readContract", describeNetworkError(error));
  finish();
}

if (nativeWei === 0n) {
  info("");
  info("Native balance is zero — a transfer will fail for gas.");
  info("Run: npm run spike:balance -- --faucet");
}

if (usdcAtomic === 0n) {
  info("");
  info("USDC balance is zero — spike:transfer has nothing to send.");
  info("Run: npm run spike:balance -- --faucet=usdc");
}

finish();
