/**
 * SERV Reasoning client.
 *
 * SERV exposes an OpenAI-compatible inference API. There is no separate SERV
 * inference SDK — we use the official `openai` package with the base URL
 * overridden. (The npm package `openserv-labs/sdk` is a different product,
 * for marketplace agents. It is not used here.)
 *
 * UNVERIFIED AT TIME OF WRITING: the base URL, the model name and the serv_*
 * tool shapes below come from the project brief and have not been exercised
 * against the live endpoint from this machine. `npm run spike:serv` is what
 * confirms them. Until that spike passes, treat this module as wired but
 * unproven.
 */

import OpenAI from "openai";
import { assertServer, optionalEnv, requireEnv } from "../server-guard";

assertServer("lib/serv/client.ts");

/** SERV's OpenAI-shaped base URL. */
export const SERV_BASE_URL = "https://inference-api.openserv.ai/v1";

/** Model used for opportunity assessment. */
export const SERV_MODEL = "gpt-5.4-mini";

/** Reasoning effort. SERV accepts "low" | "medium" | "high". */
export const SERV_REASONING_EFFORT = "medium" as const;

let cached: OpenAI | null = null;

/**
 * Returns the SERV client, constructing it once.
 *
 * @returns An OpenAI SDK instance pointed at SERV.
 */
export function getServClient(): OpenAI {
  if (cached) return cached;

  cached = new OpenAI({
    apiKey: requireEnv("SERV_API_KEY"),
    baseURL: optionalEnv("SERV_BASE_URL", SERV_BASE_URL),
    // A hung inference call must not hold a request open indefinitely.
    timeout: 120_000,
    maxRetries: 1,
  });

  return cached;
}

/**
 * SERV platform tools.
 *
 * These take no runtime arguments. SERV strips serv_* tools from the request
 * before the model sees them and applies them as platform behaviour, so
 * configuration travels as a `default` on each schema parameter rather than
 * as a call argument.
 */
export const SERV_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "serv_prompt_guard",
      description:
        "SERV platform tool. Screens the prompt for injection attempts.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "serv_shadow_agent",
      description:
        "SERV platform tool. A second model validates the response and " +
        "regenerates it when validation fails.",
      parameters: {
        type: "object",
        properties: {
          hint: {
            type: "string",
            default:
              "Verify the assessment is internally consistent and that every " +
              "band is one of LOW, MEDIUM or HIGH.",
          },
          max_iterations: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 3,
          },
        },
      },
    },
  },
];

/**
 * True when an error is a Shadow Agent validation or regeneration failure.
 *
 * SERV surfaces these as HTTP 502. A 502 means the platform could not produce
 * content it was willing to stand behind — so the only safe reading is a hard
 * reject. It must never be retried into acceptance or treated as content that
 * merely failed to validate.
 *
 * @param error - The thrown error.
 * @returns Whether this is a Shadow Agent hard failure.
 */
export function isShadowAgentFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 502
  );
}
