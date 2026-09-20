/**
 * Server-only guard.
 *
 * Every module that touches a credential imports assertServer() at module
 * scope. If a client component ever pulls one of these in by accident, the
 * import throws at build/render time instead of silently shipping the code
 * path — and therefore the env-var names — into the browser bundle.
 */

/** Throws if the module graph containing this call reached the browser. */
export function assertServer(moduleName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(
      `${moduleName} is server-only and was imported into client code. ` +
        `This module reads credentials; it must never reach the browser.`,
    );
  }
}

/**
 * Reads a required environment variable.
 *
 * Fails loudly and immediately rather than letting an undefined value travel
 * downstream and surface later as an opaque SDK error.
 *
 * @param name - The variable name.
 * @returns The non-empty value.
 */
export function requireEnv(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return raw.trim();
}

/**
 * Reads an optional environment variable.
 *
 * @param name - The variable name.
 * @param fallback - Value to use when unset or empty.
 * @returns The value or the fallback.
 */
export function optionalEnv(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw.trim() === "" ? fallback : raw.trim();
}

/**
 * Guards against a credential being exposed through a NEXT_PUBLIC_ alias.
 *
 * Called by the health route so a misconfiguration shows up in a smoke test
 * rather than in a shipped bundle.
 *
 * @returns Names of any offending variables. Empty means clean.
 */
export function findPublicCredentialLeaks(): string[] {
  const sensitive = [
    "SERV_API_KEY",
    "CDP_API_KEY_ID",
    "CDP_API_KEY_SECRET",
    "CDP_WALLET_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  return Object.keys(process.env).filter(
    (key) =>
      key.startsWith("NEXT_PUBLIC_") &&
      sensitive.some((s) => key.includes(s)),
  );
}
