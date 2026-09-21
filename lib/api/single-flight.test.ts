/**
 * The duplicate-execution guard.
 *
 * The property under test is narrow and important: the same intent submitted
 * twice while the first is still running must be refused, and a refusal must
 * never leave the intent permanently blocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlreadyInFlightError, runExclusive } from "./single-flight";

/** A promise the test resolves by hand, so two calls genuinely overlap. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("runExclusive", () => {
  beforeEach(() => {
    // Each test gets a clean map; the store lives on globalThis by design.
    const g = globalThis as unknown as Record<symbol, Map<string, number>>;
    g[Symbol.for("agentvault.inflight")] = new Map();
  });

  it("refuses a second run of the same intent while the first is in flight", async () => {
    const gate = deferred<string>();
    const first = runExclusive("opp-a:0.01", () => gate.promise);

    await expect(
      runExclusive("opp-a:0.01", async () => "second"),
    ).rejects.toBeInstanceOf(AlreadyInFlightError);

    gate.resolve("first");
    expect(await first).toBe("first");
  });

  it("allows a different amount — that is a different intent", async () => {
    const gate = deferred<string>();
    const first = runExclusive("opp-a:0.01", () => gate.promise);

    await expect(runExclusive("opp-a:0.02", async () => "other")).resolves.toBe(
      "other",
    );

    gate.resolve("first");
    await first;
  });

  it("allows a different opportunity", async () => {
    const gate = deferred<string>();
    const first = runExclusive("opp-a:0.01", () => gate.promise);

    await expect(runExclusive("opp-b:0.01", async () => "other")).resolves.toBe(
      "other",
    );

    gate.resolve("first");
    await first;
  });

  it("releases after success, so the same intent can run again", async () => {
    expect(await runExclusive("opp-a:0.01", async () => 1)).toBe(1);
    expect(await runExclusive("opp-a:0.01", async () => 2)).toBe(2);
  });

  it("releases after failure — one error must not block the intent for good", async () => {
    await expect(
      runExclusive("opp-a:0.01", async () => {
        throw new Error("chain refused");
      }),
    ).rejects.toThrow("chain refused");

    // The guard must be clear, not stuck holding a dead entry.
    expect(await runExclusive("opp-a:0.01", async () => "recovered")).toBe(
      "recovered",
    );
  });

  it("expires an entry left behind by a process that died mid-execution", async () => {
    const g = globalThis as unknown as Record<symbol, Map<string, number>>;
    // 91s ago: past STALE_AFTER_MS, which sits above the route's maxDuration
    // so it can never expire a request that is genuinely still running.
    g[Symbol.for("agentvault.inflight")].set("opp-a:0.01", Date.now() - 91_000);

    expect(await runExclusive("opp-a:0.01", async () => "proceeded")).toBe(
      "proceeded",
    );
  });

  it("surfaces the intent in the error so the UI can say what collided", async () => {
    const gate = deferred<string>();
    const first = runExclusive("opp-volatile:0.01", () => gate.promise);

    await expect(
      runExclusive("opp-volatile:0.01", async () => "x"),
    ).rejects.toThrow(/opp-volatile:0\.01/);

    gate.resolve("done");
    await first;
  });
});
