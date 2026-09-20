/**
 * Network spike: the wallet is stable.
 *
 * This is the regression test for the configureWithWallet bug. It resolves
 * the wallet twice — once warm from the memoised provider, once cold after
 * clearing the cache — and fails if the two addresses differ.
 *
 * A cold resolution that produces a different address means the named-account
 * fix has been undone and every hot reload is minting a fresh empty wallet.
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
import {
  getWalletProvider,
  getWalletSnapshot,
  resetWalletCache,
} from "../lib/agentkit/wallet";
import { BASE_SEPOLIA_CHAIN_ID } from "../lib/policy/types";
import { describeNetworkError } from "./_report";

loadEnv();
heading("SPIKE: stable wallet resolution");
requireEnvOrFatal([
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
]);

value("wallet name", process.env.AGENT_WALLET_NAME ?? "agentvault-agent");
value("network", process.env.NETWORK_ID ?? "base-sepolia");

info("resolving wallet (first call)…");

let snapshot;
try {
  snapshot = await getWalletSnapshot();
} catch (error) {
  check(false, "reached the Coinbase API and resolved a wallet", describeNetworkError(error));
  finish();
}

value("address", snapshot.address);
value("networkId", snapshot.networkId ?? "(none)");
value("chainId", snapshot.chainId ?? "(none)");
value("native balance (wei)", snapshot.nativeBalanceWei);

check(
  /^0x[a-fA-F0-9]{40}$/.test(snapshot.address),
  "address is a well-formed EVM address",
  snapshot.address,
);

check(
  snapshot.chainId === String(BASE_SEPOLIA_CHAIN_ID),
  `chain is Base Sepolia (${BASE_SEPOLIA_CHAIN_ID})`,
  `got chainId ${snapshot.chainId}`,
);

info("resolving again from the warm cache…");
let warm;
try {
  warm = await getWalletProvider();
} catch (error) {
  check(false, "warm resolution succeeded", describeNetworkError(error));
  finish();
}
check(
  warm.getAddress() === snapshot.address,
  "the memoised provider returns the same address",
  `${warm.getAddress()} !== ${snapshot.address}`,
);

info("clearing the cache and resolving cold — this is the real regression test…");
resetWalletCache();
let cold;
try {
  cold = await getWalletProvider();
} catch (error) {
  check(false, "cold resolution succeeded", describeNetworkError(error));
  finish();
}
value("cold address", cold.getAddress());

check(
  cold.getAddress() === snapshot.address,
  "a COLD resolution returns the SAME address (configureWithWallet fix intact)",
  `cold ${cold.getAddress()} !== warm ${snapshot.address} — ` +
    `a new wallet was created. The named-account fix in lib/agentkit/wallet.ts ` +
    `has been undone.`,
);

finish();
