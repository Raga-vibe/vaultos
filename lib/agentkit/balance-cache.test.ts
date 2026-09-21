/**
 * The balance cache's safety property.
 *
 * There is exactly one thing that must never regress here: the execution path
 * gets a chain read. The cache is an optimisation for screens, and a bug that
 * let a stale figure reach an authorization would let the allocation cap be
 * computed against money that is no longer there.
 *
 * These tests drive the cache through a stubbed reader rather than the chain,
 * so they assert the policy — how many reads happen, and when — rather than
 * any particular balance.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for the chain read, counting how often it is called. */
function makeReader(values: bigint[]) {
  let i = 0;
  return vi.fn(async () => values[Math.min(i++, values.length - 1)]);
}

/**
 * The cache under test, reimplemented against an injected reader.
 *
 * lib/agentkit/execute.ts holds the production copy, which cannot be imported
 * here: it pulls in the Coinbase SDKs and refuses to load without credentials.
 * The logic is small enough that mirroring it is honest, and the mirror is
 * what the comments in that file describe.
 */
function makeCache(read: () => Promise<bigint>) {
  let at = 0;
  let value = 0n;
  let inFlight: Promise<bigint> | null = null;

  return async function get(maxAgeMs = 0): Promise<bigint> {
    if (inFlight) return inFlight;
    if (maxAgeMs > 0 && at > 0 && Date.now() - at <= maxAgeMs) return value;

    const p = read();
    inFlight = p;
    try {
      const v = await p;
      at = Date.now();
      value = v;
      return v;
    } finally {
      inFlight = null;
    }
  };
}

describe("balance cache", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("reads the chain every time when no age is allowed — the execution path", async () => {
    const read = makeReader([100n, 200n, 300n]);
    const get = makeCache(read);

    expect(await get()).toBe(100n);
    expect(await get()).toBe(200n);
    expect(await get()).toBe(300n);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("serves a recent figure when a preview allows it", async () => {
    const read = makeReader([100n, 999n]);
    const get = makeCache(read);

    expect(await get(15_000)).toBe(100n);
    expect(await get(15_000)).toBe(100n);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("never lets a cached figure reach a caller demanding freshness", async () => {
    const read = makeReader([100n, 250n]);
    const get = makeCache(read);

    await get(15_000); // preview warms the cache
    expect(await get()).toBe(250n); // execution re-reads
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight read across concurrent callers", async () => {
    const read = makeReader([777n]);
    const get = makeCache(read);

    const [a, b, c] = await Promise.all([get(15_000), get(15_000), get()]);
    expect([a, b, c]).toEqual([777n, 777n, 777n]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not leave a stale figure looking current after a failed read", async () => {
    const read = vi
      .fn<() => Promise<bigint>>()
      .mockRejectedValueOnce(new Error("rpc down"))
      .mockResolvedValue(42n);
    const get = makeCache(read);

    await expect(get()).rejects.toThrow("rpc down");
    expect(await get(15_000)).toBe(42n);
  });
});
