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
  wallet?: WalletInfo["wallet"];
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
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  let body: Envelope<T>;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new Error(`${path} returned a non-JSON response (${response.status}).`);
  }

  if (!body.ok) throw new Error(body.error);
  return body as unknown as T;
}

export const api = {
  health: () => call<Health>("/api/health"),
  wallet: () => call<WalletInfo>("/api/wallet"),
  opportunities: () => call<{ opportunities: Opportunity[] }>("/api/opportunities"),
  policy: () => call<{ policy: Policy; isDefault: boolean }>("/api/policy"),
  savePolicy: (policy: Policy) =>
    call<{ policy: Policy }>("/api/policy", {
      method: "PUT",
      body: JSON.stringify(policy),
    }),
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
  execute: (opportunityId: string, amount: string) =>
    call<ExecuteResult>("/api/execute", {
      method: "POST",
      body: JSON.stringify({ opportunityId, amount }),
    }),
  audit: (limit?: number) =>
    call<{ events: AuditEvent[] }>(
      `/api/audit${limit ? `?limit=${limit}` : ""}`,
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
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The effect only starts work; every setState happens in a callback after
  // the fetch settles. Setting state synchronously in an effect body would
  // cascade an extra render on every mount.
  useEffect(() => {
    fetcher()
      .then((value) => {
        if (alive.current) {
          setData(value);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive.current) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  // Reload is an event handler, so it may set state directly.
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, error, loading, reload };
}
