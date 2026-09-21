/**
 * The require(esm) version boundary.
 *
 * This is a small function guarding an expensive mistake: a wrong answer here
 * would tell someone their Node is fine while every wallet route is dying on
 * ERR_REQUIRE_ESM. The awkward cases are the ones worth pinning — 20.18 is
 * too old, 20.19 is exactly old enough, and Node 21 never received the
 * backport at all despite sitting between two versions that did.
 */

import { describe, expect, it } from "vitest";
import { nodeSupportsRequireEsm } from "./runtime-info";

describe("nodeSupportsRequireEsm", () => {
  it("rejects the Node 20 releases below the backport", () => {
    expect(nodeSupportsRequireEsm("v20.9.0")).toBe(false);
    expect(nodeSupportsRequireEsm("v20.18.3")).toBe(false);
  });

  it("accepts Node 20.19 and later on the 20 line", () => {
    expect(nodeSupportsRequireEsm("v20.19.0")).toBe(true);
    expect(nodeSupportsRequireEsm("v20.20.1")).toBe(true);
  });

  it("rejects Node 21 entirely — it never got the backport", () => {
    expect(nodeSupportsRequireEsm("v21.7.3")).toBe(false);
  });

  it("splits the Node 22 line at 22.12", () => {
    expect(nodeSupportsRequireEsm("v22.11.0")).toBe(false);
    expect(nodeSupportsRequireEsm("v22.12.0")).toBe(true);
    expect(nodeSupportsRequireEsm("v22.22.2")).toBe(true);
  });

  it("accepts Node 23 and above", () => {
    expect(nodeSupportsRequireEsm("v23.0.0")).toBe(true);
    expect(nodeSupportsRequireEsm("v24.11.0")).toBe(true);
  });

  it("fails closed on anything it cannot parse", () => {
    expect(nodeSupportsRequireEsm("not-a-version")).toBe(false);
    expect(nodeSupportsRequireEsm("")).toBe(false);
  });
});
