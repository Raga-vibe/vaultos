/**
 * Shared spike reporting.
 *
 * Every spike uses this so results look the same and, more importantly, so a
 * failure is impossible to mistake for a pass. A failed check sets the exit
 * code to 1. No spike ever prints a success line it did not earn.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

let failures = 0;
let checks = 0;

const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const DIM = "\u001b[2m";
const BOLD = "\u001b[1m";
const RESET = "\u001b[0m";

/**
 * Loads .env.local, then .env, if present.
 *
 * Spikes run outside Next, which does this automatically. Without it, every
 * spike would fail on a missing variable that is in fact set.
 */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      try {
        process.loadEnvFile(path);
        info(`loaded ${file}`);
      } catch (error) {
        info(`could not load ${file}: ${String(error)}`);
      }
    }
  }
}

/**
 * Prints a spike header.
 *
 * @param title - The spike name.
 */
export function heading(title: string): void {
  console.log(`\n${BOLD}${title}${RESET}`);
  console.log(`${DIM}${"─".repeat(Math.max(title.length, 40))}${RESET}`);
}

/**
 * Prints a dim informational line.
 *
 * @param message - The message.
 */
export function info(message: string): void {
  console.log(`${DIM}  ${message}${RESET}`);
}

/**
 * Prints a labelled value.
 *
 * @param label - The label.
 * @param value - The value.
 */
export function value(label: string, value: unknown): void {
  console.log(`  ${label.padEnd(24)} ${BOLD}${String(value)}${RESET}`);
}

/**
 * Records a check.
 *
 * @param passed - Whether it passed.
 * @param description - What was checked.
 * @param detail - Extra context shown on failure.
 */
export function check(
  passed: boolean,
  description: string,
  detail?: string,
): void {
  checks++;
  if (passed) {
    console.log(`  ${GREEN}PASS${RESET}  ${description}`);
  } else {
    failures++;
    console.log(`  ${RED}FAIL${RESET}  ${description}`);
    if (detail) console.log(`        ${RED}${detail}${RESET}`);
  }
}

/**
 * Records an outright failure and stops the spike.
 *
 * Used when a prerequisite is missing, so the spike cannot report either way.
 *
 * @param message - What went wrong.
 * @returns Never — exits the process.
 */
export function fatal(message: string): never {
  failures++;
  console.log(`\n  ${RED}${BOLD}FATAL${RESET} ${RED}${message}${RESET}`);
  console.log(
    `\n${RED}Spike aborted. Nothing was verified — do not treat this as a pass.${RESET}\n`,
  );
  process.exit(1);
}

/**
 * Prints the summary and sets the exit code.
 *
 * @returns Never — exits the process.
 */
export function finish(): never {
  console.log();
  if (failures === 0) {
    console.log(`${GREEN}${BOLD}  ${checks}/${checks} checks passed.${RESET}\n`);
    process.exit(0);
  }
  console.log(
    `${RED}${BOLD}  ${failures} of ${checks} checks FAILED.${RESET}\n`,
  );
  process.exit(1);
}

/**
 * Asserts an environment variable is present, or aborts.
 *
 * @param names - Required variable names.
 */
export function requireEnvOrFatal(names: string[]): void {
  const missing = names.filter(
    (n) => !process.env[n] || process.env[n]!.trim() === "",
  );
  if (missing.length > 0) {
    fatal(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local and fill them in.`,
    );
  }
}

/**
 * Turns a raw SDK error into something a human can act on.
 *
 * Network failures from the CDP SDK arrive as deep nested objects with a
 * stack trace attached. Buried inside is usually a single code — ENOTFOUND,
 * ECONNRESET, ETIMEDOUT — that says exactly what to do about it. This digs
 * that out and says so in plain words.
 *
 * @param error - The thrown error.
 * @returns A one-or-two line explanation.
 */
export function describeNetworkError(error: unknown): string {
  const e = error as {
    message?: string;
    errorType?: string;
    networkDetails?: { code?: string; message?: string };
    cause?: { code?: string; hostname?: string };
  };

  const code = e?.networkDetails?.code ?? e?.cause?.code;
  const host = e?.cause?.hostname;
  const base = e?.message ?? String(error);

  const hints: Record<string, string> = {
    ENOTFOUND:
      `DNS lookup failed${host ? ` for ${host}` : ""} — your machine could not ` +
      `find that server. The request never left your computer. Check your ` +
      `internet connection, or try a different DNS server (1.1.1.1 or 8.8.8.8).`,
    ECONNRESET:
      `The connection was cut mid-request. Usually a flaky link or a firewall. ` +
      `Retrying often works.`,
    ETIMEDOUT:
      `The server did not answer in time. Check your connection, or whether a ` +
      `VPN or proxy is interfering.`,
    ECONNREFUSED:
      `The server actively refused the connection. Something is blocking it ` +
      `locally — firewall, proxy or VPN.`,
    EAI_AGAIN:
      `Temporary DNS failure. Your network's name lookup is struggling; wait ` +
      `a moment and retry.`,
  };

  const hint = code ? hints[code] : undefined;
  return hint ? `${base}\n        → ${hint}` : base;
}
