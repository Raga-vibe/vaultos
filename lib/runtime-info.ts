/**
 * Which Node is actually serving this process.
 *
 * This exists because of one deployment failure that cost more time than it
 * should have. @coinbase/cdp-sdk's CommonJS build calls require("jose"), and
 * jose 6 is ESM-only. Requiring an ES module from CommonJS is supported from
 * Node 20.19 and 22.12 onward; below that it throws ERR_REQUIRE_ESM and every
 * route that touches a wallet dies while loading.
 *
 * The version the host serves is therefore load-bearing — and it was also the
 * one fact nobody could see. package.json said one thing, the dashboard said
 * another, and the only observable symptom was a 500. So the running version
 * is reported by /api/health, where it can be read in a browser rather than
 * inferred from configuration files that may or may not have taken effect.
 *
 * Nothing here reads a credential. process.version is a public constant.
 */

/** The first Node releases on each line that can require() an ES module. */
export const REQUIRE_ESM_MINIMUMS = "20.19, 22.12, or any Node 23+";

/**
 * Whether this Node can require() an ES module.
 *
 * Node 21 never received the backport, so it is excluded deliberately rather
 * than by accident of a `>=` comparison.
 *
 * @param version - A Node version string, defaulting to the running one.
 * @returns True when require(esm) is supported.
 */
export function nodeSupportsRequireEsm(version: string = process.version): boolean {
  const match = /^v(\d+)\.(\d+)\./.exec(version);
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2]);

  if (major >= 23) return true;
  if (major === 22) return minor >= 12;
  if (major === 20) return minor >= 19;
  return false;
}

/** A public, credential-free description of the serving runtime. */
export type RuntimeInfo = {
  node: string;
  /** What the version number alone implies about require(esm). */
  versionSupportsRequireEsm: boolean;
  /**
   * What Node itself reports — the only answer that counts.
   *
   * The version number is a claim about the release; this flag is the running
   * process telling the truth about itself. They came apart on the deployed
   * host: Node 24.20 by version, ERR_REQUIRE_ESM in practice. A feature can
   * be switched off by a command-line flag or NODE_OPTIONS no matter what the
   * version says, so this is reported separately rather than inferred.
   *
   * Undefined on any Node old enough not to publish the flag at all.
   */
  requireModuleEnabled: boolean | undefined;
  requiresAtLeast: string;
};

/**
 * Describes the running Node.
 *
 * @returns The runtime description.
 */
export function runtimeInfo(): RuntimeInfo {
  const features = process.features as unknown as {
    require_module?: boolean;
  };

  return {
    node: process.version,
    versionSupportsRequireEsm: nodeSupportsRequireEsm(),
    requireModuleEnabled: features.require_module,
    requiresAtLeast: REQUIRE_ESM_MINIMUMS,
  };
}
