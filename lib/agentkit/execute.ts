/**
 * On-chain execution.
 *
 * THE BUG THIS MODULE EXISTS TO PREVENT
 *
 * AgentKit's ERC20 `transfer` action never throws. Verified in the installed
 * package's compiled source (dist/action-providers/erc20/erc20ActionProvider.js):
 * every failure path returns a STRING beginning with "Error", and the whole
 * body is wrapped in
 *
 *     catch (error) { return `Error transferring the asset: ${error}`; }
 *
 * There are five distinct such returns — unfetchable token details,
 * insufficient balance, destination is the token contract, destination is an
 * ERC20 contract, and the catch-all. A caller that only watches for
 * exceptions reads every one of them as success.
 *
 * So: this module treats an "Error" prefix, or a response with no parseable
 * 0x transaction hash, as a hard failure. Nothing here ever reports a
 * transaction as submitted without a hash it actually extracted.
 */

import { encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";
import { assertServer } from "../server-guard";
import { getWalletProvider } from "./wallet";
import { BASE_SEPOLIA_USDC } from "../opportunities/source";

assertServer("lib/agentkit/execute.ts");

/**
 * Loads AgentKit at call time. See lib/agentkit/wallet.ts for why this is not
 * a static import — in short, a failed top-level import kills the whole route
 * before any error of ours can be reported.
 *
 * @returns AgentKit's entry points.
 */
async function loadAgentKit() {
  try {
    const m = await import("@coinbase/agentkit");
    return { AgentKit: m.AgentKit, erc20ActionProvider: m.erc20ActionProvider };
  } catch (error) {
    throw new Error(
      `Could not load @coinbase/agentkit at runtime: ${String(error)}`,
    );
  }
}

/** Matches a 0x-prefixed 32-byte hash anywhere in a string. */
const TX_HASH_PATTERN = /0x[a-fA-F0-9]{64}/;

/** Result of a submission attempt. Never ambiguous. */
export type SubmitResult =
  | { ok: true; hash: Hex }
  | { ok: false; reason: string; raw: string | null };

/** Result of waiting for a receipt. */
export type ConfirmResult =
  | { ok: true; hash: Hex; blockNumber: string; gasUsed: string }
  | { ok: false; hash: Hex; reason: string };

/**
 * A short-lived, per-token balance cache.
 *
 * WHY THIS EXISTS
 *
 * The public Base Sepolia RPC answers a single call in one to six seconds.
 * The opportunities grid evaluates six actions on load, and each evaluation
 * read the balance independently, so the page took roughly half a minute to
 * fill. Measured on the deployed site: ~7s per API call, warm or cold.
 *
 * WHY IT IS SAFE
 *
 * The default is zero. A caller gets a fresh chain read unless it explicitly
 * asks for a stale one, so the only paths that can use a cached figure are
 * the ones that opt in — the display and preview reads. The execution path
 * passes nothing and therefore always re-reads the chain before a transfer is
 * authorised, which is the property the whole product rests on: a cap is
 * computed against the real balance at the moment money would move.
 *
 * In-flight reads are shared regardless of the requested age. A read that
 * started moments ago is by definition fresh, so joining it is never staler
 * than issuing a second one.
 */
type BalanceEntry = {
  at: number;
  value: bigint;
  inFlight: Promise<bigint> | null;
};

const BALANCE_CACHE_KEY = Symbol.for("agentvault.balance.cache");

/**
 * The process-wide balance cache.
 *
 * @returns The map, created on first use.
 */
function balanceCache(): Map<string, BalanceEntry> {
  const g = globalThis as unknown as Record<
    symbol,
    Map<string, BalanceEntry> | undefined
  >;
  if (!g[BALANCE_CACHE_KEY]) g[BALANCE_CACHE_KEY] = new Map();
  return g[BALANCE_CACHE_KEY];
}

/**
 * Reads a wallet's ERC20 balance in atomic units.
 *
 * Goes to the chain, never to a model-supplied figure. This is the balance
 * the policy engine's allocation cap is computed against.
 *
 * @param tokenAddress - The ERC20 contract. Defaults to Base Sepolia USDC.
 * @param maxAgeMs - How stale a previously read figure may be. Defaults to 0,
 *   meaning always re-read. Only display and preview callers pass anything
 *   else; execution never does.
 * @returns The balance in atomic units.
 */
export async function getTokenBalanceAtomic(
  tokenAddress: Address = BASE_SEPOLIA_USDC,
  maxAgeMs = 0,
): Promise<bigint> {
  const cache = balanceCache();
  const key = tokenAddress.toLowerCase();
  const entry = cache.get(key);

  // Someone is already asking the chain. Their answer is as fresh as ours.
  if (entry?.inFlight) return entry.inFlight;

  if (maxAgeMs > 0 && entry && Date.now() - entry.at <= maxAgeMs) {
    return entry.value;
  }

  const read = (async () => {
    const provider = await getWalletProvider();
    const owner = provider.getAddress() as Address;

    const balance = (await provider.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;

    return balance;
  })();

  cache.set(key, {
    at: entry?.at ?? 0,
    value: entry?.value ?? 0n,
    inFlight: read,
  });

  try {
    const value = await read;
    cache.set(key, { at: Date.now(), value, inFlight: null });
    return value;
  } catch (error) {
    // A failed read must not leave a poisoned promise behind, and must not
    // leave a stale figure looking current.
    cache.delete(key);
    throw error;
  }
}

/** Clears the balance cache. For tests and spikes. */
export function resetBalanceCache(): void {
  balanceCache().clear();
}

/**
 * Reads the wallet's native balance in wei.
 *
 * @returns The native balance.
 */
export async function getNativeBalanceWei(): Promise<bigint> {
  const provider = await getWalletProvider();
  return provider.getBalance();
}

/**
 * Submits an ERC20 transfer directly.
 *
 * The preferred path. sendTransaction throws on failure, so a returned hash
 * means the transaction really was submitted — no string parsing required.
 *
 * @param to - Recipient address.
 * @param amountAtomic - Amount in the token's atomic units.
 * @param tokenAddress - The ERC20 contract. Defaults to Base Sepolia USDC.
 * @returns A discriminated result.
 */
export async function submitTokenTransfer(
  to: Address,
  amountAtomic: bigint,
  tokenAddress: Address = BASE_SEPOLIA_USDC,
): Promise<SubmitResult> {
  if (amountAtomic <= 0n) {
    return {
      ok: false,
      reason: `Refusing to submit a transfer of ${amountAtomic.toString()}.`,
      raw: null,
    };
  }

  try {
    const provider = await getWalletProvider();

    const hash = await provider.sendTransaction({
      to: tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, amountAtomic],
      }),
    } as any);

    if (typeof hash !== "string" || !TX_HASH_PATTERN.test(hash)) {
      return {
        ok: false,
        reason: `sendTransaction returned no usable hash: ${String(hash)}`,
        raw: typeof hash === "string" ? hash : null,
      };
    }

    return { ok: true, hash: hash as Hex };
  } catch (error) {
    return {
      ok: false,
      reason: `Transfer submission failed: ${String(error)}`,
      raw: null,
    };
  }
}

/**
 * Submits a transfer through AgentKit's action interface.
 *
 * Kept because the action path is what an agent framework would drive, and
 * the hackathon track is about agents with wallets. It is wrapped in the
 * string-failure guard described at the top of this file.
 *
 * @param to - Recipient address.
 * @param amount - Human-readable amount, e.g. "0.01". AgentKit's action takes
 *   whole-token units and converts internally.
 * @param tokenAddress - The ERC20 contract. Defaults to Base Sepolia USDC.
 * @returns A discriminated result.
 */
export async function submitTokenTransferViaAction(
  to: Address,
  amount: string,
  tokenAddress: Address = BASE_SEPOLIA_USDC,
): Promise<SubmitResult> {
  let raw: string | null = null;

  try {
    const { AgentKit, erc20ActionProvider } = await loadAgentKit();
    const walletProvider = await getWalletProvider();
    const agentKit = await AgentKit.from({
      walletProvider,
      actionProviders: [erc20ActionProvider()],
    });

    const action = agentKit
      .getActions()
      .find((a) => a.name.toLowerCase().includes("transfer"));

    if (!action) {
      return {
        ok: false,
        reason: "No transfer action was registered on the AgentKit instance.",
        raw: null,
      };
    }

    raw = await action.invoke({
      amount,
      tokenAddress,
      destinationAddress: to,
    } as any);

    // GUARD 1 — the action signals failure by string, not by throwing.
    if (typeof raw !== "string") {
      return {
        ok: false,
        reason: `Action returned ${typeof raw}, expected a string.`,
        raw: null,
      };
    }

    if (raw.trimStart().toLowerCase().startsWith("error")) {
      return {
        ok: false,
        reason: `AgentKit transfer action reported failure: ${raw}`,
        raw,
      };
    }

    // GUARD 2 — a success-shaped string with no hash is not a success.
    const match = raw.match(TX_HASH_PATTERN);
    if (!match) {
      return {
        ok: false,
        reason:
          `AgentKit transfer action returned no parseable transaction hash. ` +
          `Refusing to report this as submitted. Response: ${raw}`,
        raw,
      };
    }

    return { ok: true, hash: match[0] as Hex };
  } catch (error) {
    return {
      ok: false,
      reason: `Action invocation threw: ${String(error)}`,
      raw,
    };
  }
}

/**
 * Waits for a transaction receipt and checks that it actually succeeded.
 *
 * A mined transaction is not a successful one. A reverted transaction has a
 * receipt with status "reverted", and this reports that as a failure.
 *
 * @param hash - The transaction hash.
 * @returns A discriminated result.
 */
export async function confirmTransaction(hash: Hex): Promise<ConfirmResult> {
  try {
    const provider = await getWalletProvider();
    const receipt = await provider.waitForTransactionReceipt(hash);

    if (!receipt) {
      return { ok: false, hash, reason: "Receipt was empty." };
    }

    const status = String(receipt.status);
    if (status !== "success" && status !== "1") {
      return {
        ok: false,
        hash,
        reason: `Transaction was mined but reverted (status: ${status}).`,
      };
    }

    return {
      ok: true,
      hash,
      blockNumber: String(receipt.blockNumber ?? "unknown"),
      gasUsed: String(receipt.gasUsed ?? "unknown"),
    };
  } catch (error) {
    return {
      ok: false,
      hash,
      reason: `Waiting for receipt failed: ${String(error)}`,
    };
  }
}
