/**
 * Network spike: fetch and check a receipt for a known hash.
 *
 *   npm run spike:receipt -- 0x<hash>
 *
 * Separate from spike:transfer so a hash can be re-checked later without
 * sending anything.
 */

import {
  check,
  fatal,
  finish,
  heading,
  info,
  loadEnv,
  requireEnvOrFatal,
  value,
} from "./_report";
import type { Hex } from "viem";
import { confirmTransaction } from "../lib/agentkit/execute";

loadEnv();
heading("SPIKE: transaction receipt");
requireEnvOrFatal([
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
]);

const hash = process.argv.find((a) => /^0x[a-fA-F0-9]{64}$/.test(a)) as
  | Hex
  | undefined;

if (!hash) {
  fatal(
    "No transaction hash given. Usage: npm run spike:receipt -- 0x<64 hex chars>",
  );
}

value("hash", hash);
info("fetching receipt…");

const result = await confirmTransaction(hash);

if (!result.ok) {
  check(false, "receipt retrieved and transaction succeeded", result.reason);
  finish();
}

check(true, "receipt retrieved and transaction succeeded");
value("block", result.blockNumber);
value("gas used", result.gasUsed);
value("explorer", `https://sepolia.basescan.org/tx/${hash}`);

finish();
