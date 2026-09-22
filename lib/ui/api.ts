"use client";

/**
 * Typed client for the existing API.
 *
 * This file is a transport layer and nothing more. It does not evaluate a
 * policy, does not decide a verdict, and does not interpret a SERV assessment
 * as permission. Every judgement in this application happens on the server —
 * the browser asks and displays.
 *
 * The shapes below mirror what the routes already return. They are declared
 * here rather than imported from the server tree so that no server module is
 * ever pulled into the client bundle by accident.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Risk and liquidity bands, mirroring lib/policy/types.ts. */
export type Band = "LOW" | "MEDIUM" | "HIGH";

/** The policy, as the API returns it — bigints arrive as strings. */
export type Policy = {
  maxAllocationPercent: number;
  maxRisk: Band;
  minLiquidity: Band;
  leverageAllowed: boolean;
  autoExecute: boolean;
  maxTotalExposurePercent?: number;
  minReserveAtomic?: string;
  maxActionsPerDay?: number;
  maxDailyDeployedPercent?: number;
  cooldownSeconds?: number;
  allowedProtocols?: string[];
  blockedProtocols?: string[];
};

export type Opportunity = {
  id: string;
  name: string;
  protocol: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  estimatedApyBps: number;
  risk: Band;
  liquidity: Band;
  usesLeverage: boolean;
  description: string;
  dataSource: "SEEDED";
  demonstrates: string;
  depositAddress: string | null;
};

export type Violation = { code: string; message: string };

export type Verdict = {
  decision: "APPROVED" | "REJECTED";
  requiresManualApproval: boolean;
  violations: Violation[];
  allocationBps: number | null;
  evaluated: string[];
};

export type CanonicalAction = {
  opportunityId: string;
  protocol: string;
  chainId: number;
  tokenSymbol: string;
  amountAtomic: string;
  walletBalanceAtomic: string;
  risk: Band;
  liquidity: Band;
  usesLeverage: boolean;
};

export type Assessment = {
  summary: string;
  riskAssessment: Band;
  liquidityAssessment: Band;
  recommendedAllocationPercent: number;
  usesLeverage: boolean;
  rationale: string;
  concerns: string[];
  confidence: Band;
};

export type WalletInfo = {
  wallet: {
    address: string;
    networkId?: string;
    chainId?: string;
    protocolFamily: string;
    nativeBalanceWei: string;
  };
  usdc: { atomic: string; decimals: number; address: string };
};

export type Health = {
  /** Absent in lite mode, which skips the wallet resolution. */
  wallet?: WalletInfo["wallet"];
  lite?: boolean;
  rpcConfigured?: boolean;
  expectedChainId?: number;
  onExpectedChain?: boolean;
  store?: "memory" | "supabase";
  depositAddressConfigured?: boolean;
  error?: string;
};

export type AuditEvent = {
  seq: number;
  at: string;
  type: string;
  opportunityId: string | null;
  detail: Record<string, unknown>;
  verdict: Verdict | null;
};

export type EvaluateResult = {
  decision: "APPROVED" | "REJECTED";
  verdict: Verdict;
  action: CanonicalAction;
  policy: Policy;
  context: { now: string; recentActionCount: number; openExposureAtomic: string };
  executed: boolean;
};

export type ExecuteResult = EvaluateResult & {
  requiresManualApproval?: boolean;
  reason?: string;
  transaction?: {
    hash: string;
    block: string;
    gasUsed: string;
    explorer: string;
  };
};

/** Anything the API returns is wrapped in ok/error. */
type Envelope<T> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Calls an API route.
 *
 * Surfaces the server's own error text rather than inventing one — the routes
 * already phrase their refusals for a human, and rewording them in the client
 * would only obscure what actually happened.
 *
 * @param path - Route path.
 * @param init - Fetch options.
 * @returns The unwrapped payload.
 * @throws With the server's message when ok is false.
 */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (error) {
    /*
      fetch only rejects when the request never completed at all — the
      connection dropped, the host cut the function off, or the network went
      away. The browser's own wording for this is "Failed to fetch", which
      names no component and suggests nothing to do about it. Say what it
      actually means instead.
    */
    throw new Error(
      `${path} never returned. The connection dropped before a response ` +
        `arrived — usually the request taking longer than the server allows. ` +
        `Nothing was decided and nothing moved. (${String(error)})`,
    );
  }

  let body: Envelope<T>;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new Error(`${path} returned a non-JSON response (${response.status}).`);
  }

  if (!body.ok) throw new Error(body.error);
  return body as unknown as T;
}

/**
 * A short-lived cache for READ-ONLY display data.
 *
 * Every route that touches the chain costs an RPC round trip, and the public
 * Base Sepolia endpoint rate-limits. Without this, moving between Overview and
 * Opportunities re-reads the wallet each time and React's dev mode doubles it.
 *
 * WHAT IS NEVER CACHED: evaluate and execute. A verdict must be computed
 * against the balance as it is now — serving a stale balance to a policy
 * decision would let a spend be judged against money that is already gone.
 * That is the one thing caching must not touch, so those two calls bypass
 * this entirely.
 */
const CACHE_TTL_MS = 8_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

/**
 * Wraps a read-only call with a brief cache and request de-duplication.
 *
 * Concurrent callers share one in-flight promise, so the four components that
 * want the wallet on first paint produce one request rather than four.
 *
 * @param key - Cache key.
 * @param fetcher - The call to make on a miss.
 * @returns The shared or fresh result.
 */
function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.value as Promise<T>;
  }
  const value = fetcher().catch((e: unknown) => {
    // A failure must not be cached, or one blip poisons the next 8 seconds.
    cache.delete(key);
    throw e;
  });
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Drops cached reads, so the next call goes to the server. */
export function invalidateReads(): void {
  cache.clear();
}

export const api = {
  health: () => cached("health", () => call<Health>("/api/health")),
  /*
    The cheap health check. Skips the CDP wallet resolution, which is the
    slowest call in the product. Use this whenever the component only needs
    `store` or `depositAddressConfigured` — which, it turns out, is every
    consumer except System status.
  */
  healthLite: () =>
    cached("health:lite", () => call<Health>("/api/health?lite=1")),
  wallet: () => cached("wallet", () => call<WalletInfo>("/api/wallet")),
  opportunities: () =>
    cached("opportunities", () =>
      call<{ opportunities: Opportunity[] }>("/api/opportunities"),
    ),
  policy: () =>
    cached("policy", () =>
      call<{ policy: Policy; isDefault: boolean }>("/api/policy"),
    ),
  savePolicy: (policy: Policy) => {
    invalidateReads();
    return call<{ policy: Policy }>("/api/policy", {
      method: "PUT",
      body: JSON.stringify(policy),
    });
  },
  assess: (opportunityId: string) =>
    call<{ opportunity: Opportunity; assessment: Assessment; advisory: true }>(
      "/api/assess",
      { method: "POST", body: JSON.stringify({ opportunityId }) },
    ),
  evaluate: (opportunityId: string, amount: string) =>
    call<EvaluateResult>("/api/evaluate", {
      method: "POST",
      body: JSON.stringify({ opportunityId, amount }),
    }),
  execute: async (opportunityId: string, amount: string) => {
    const result = await call<ExecuteResult>("/api/execute", {
      method: "POST",
      body: JSON.stringify({ opportunityId, amount }),
    });
    // The balance and the audit trail both changed. Serving the pre-execution
    // figures afterwards would be showing the user a wallet that no longer
    // exists.
    invalidateReads();
    return result;
  },
  audit: (limit?: number) =>
    cached(`audit:${limit ?? "all"}`, () =>
      call<{ events: AuditEvent[] }>(
        `/api/audit${limit ? `?limit=${limit}` : ""}`,
      ),
    ),
};

/** The lifecycle of one fetched resource. */
export type Async<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/**
 * Fetches once on mount, with a manual reload.
 *
 * Deliberately small. A caching library would be a dependency earning its
 * keep on a much larger surface than four screens.
 *
 * @param fetcher - The call to make.
 * @param deps - Re-run when these change.
 * @returns Data, error and loading state.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  /*
    Which request is allowed to write state.

    The previous version guarded only on "is the component still mounted",
    which is a different question. When deps change — a reload, a changed
    amount — the earlier fetch is not cancelled, and if it settles second it
    overwrites the newer answer with an older one. On a screen showing a
    policy verdict that is not a cosmetic bug: it can show a verdict computed
    against a balance or a policy that has since changed.

    Each run claims a number. Only the newest may write.
  */
  const run = useRef(0);

  useEffect(() => {
    const mine = ++run.current;

    fetcher()
      .then((value) => {
        if (run.current !== mine) return;
        setData(value);
        setError(null);
      })
      .catch((e: unknown) => {
        if (run.current !== mine) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (run.current !== mine) return;
        setLoading(false);
      });

    // Bumping the token on cleanup retires this run, so neither an unmount nor
    // a superseded run can write.
    return () => {
      if (run.current === mine) run.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  // Reload is an event handler, so it may set state directly.
  const reload = useCallback(() => {
    // Deliberately does NOT clear the whole read cache. Reloading one panel
    // used to force every other panel's next read back to the network, which
    // on a 1–6s RPC is the difference between a refresh and a stall. The
    // nonce below re-runs THIS fetcher; mutations still call
    // invalidateReads() for the reads they genuinely invalidate.
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, error, loading, reload };
}
