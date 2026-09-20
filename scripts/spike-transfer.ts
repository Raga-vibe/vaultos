/**
 * Network spike: a real USDC transfer on Base Sepolia.
 *
 *   npm run spike:transfer                 (sends 0.01 USDC)
 *   npm run spike:transfer -- --amount=0.5
 *
 * Requires TEST_RECIPIENT_ADDRESS. There is deliberately no default — a
 * wrong default would send testnet funds somewhere unintended and teach the
 * wrong lesson about defaults in a financial codebase.
 *
 * Both submission paths are exercised: the direct sendTransaction path, and
 * AgentKit's action path with the "never throws" guard around it.
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
import type { Address } from "viem";
import { getWalletSnapshot } from "../lib/agentkit/wallet";
import {
  confirmTransaction,
  getTokenBalanceAtomic,
  submitTokenTransfer,
} from "../lib/agentkit/execute";
import { BASE_SEPOLIA_USDC, USDC_DECIMALS } from "../lib/opportunities/source";
import { describeNetworkError } from "./_report";

loadEnv();
heading("SPIKE: USDC transfer on Base Sepolia");
requireEnvOrFatal([
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
  "TEST_RECIPIENT_ADDRESS",
]);

const recipient = process.env.TEST_RECIPIENT_ADDRESS!.trim() as Address;
if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
  check(false, "TEST_RECIPIENT_ADDRESS is a valid address", recipient);
  finish();
}

const amountArg = process.argv.find((a) => a.startsWith("--amount="));
const amountHuman = amountArg ? amountArg.split("=")[1] : "0.01";
const amountAtomic = BigInt(
  Math.round(Number(amountHuman) * 10 ** USDC_DECIMALS),
);

let snapshot;
let before: bigint;
try {
  snapshot = await getWalletSnapshot();
  before = await getTokenBalanceAtomic(BASE_SEPOLIA_USDC);
} catch (error) {
  check(false, "reached the network to read the wallet and its balance", describeNetworkError(error));
  finish();
}

value("from", snapshot.address);
value("to", recipient);
value("amount", `${amountHuman} USDC (${amountAtomic} atomic)`);
value("balance before", before.toString());

if (before < amountAtomic) {
  check(
    false,
    "wallet holds enough USDC to send",
    `have ${before}, need ${amountAtomic}. Run: npm run spike:balance -- --faucet=usdc`,
  );
  finish();
}

info("submitting transfer…");
const submitted = await submitTokenTransfer(
  recipient,
  amountAtomic,
  BASE_SEPOLIA_USDC,
);

if (!submitted.ok) {
  check(false, "transfer submitted", submitted.reason);
  if (submitted.raw) info(`raw: ${submitted.raw}`);
  finish();
}

check(true, "transfer submitted");
value("TX HASH", submitted.hash);
value("explorer", `https://sepolia.basescan.org/tx/${submitted.hash}`);

info("waiting for the receipt…");
const confirmed = await confirmTransaction(submitted.hash);

if (!confirmed.ok) {
  check(false, "transaction confirmed on chain", confirmed.reason);
  finish();
}

check(true, "transaction confirmed on chain");
value("block", confirmed.blockNumber);
value("gas used", confirmed.gasUsed);

let after: bigint;
try {
  after = await getTokenBalanceAtomic(BASE_SEPOLIA_USDC);
} catch (error) {
  check(false, "re-read the balance after the transfer", describeNetworkError(error));
  finish();
}
value("balance after", after.toString());

check(
  after === before - amountAtomic,
  "balance decreased by exactly the amount sent",
  `before ${before}, after ${after}, expected ${before - amountAtomic}`,
);

info("");
info(`Record this hash for the Milestone 1 report: ${submitted.hash}`);

finish();
