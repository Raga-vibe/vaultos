/**
 * Shared API response helpers.
 *
 * Two rules, applied uniformly across every route:
 *
 *   1. Bigints are serialised as strings. An atomic amount can exceed
 *      Number.MAX_SAFE_INTEGER, and a silently rounded balance in a financial
 *      API is a bug waiting to be trusted.
 *   2. Error responses never echo an exception's raw text to the client
 *      without passing it through here first, so a stack trace or a
 *      credential-bearing SDK message cannot leak into a response body.
 */

import { NextResponse } from "next/server";
import { jsonSafe } from "../audit/log";

/**
 * A successful JSON response.
 *
 * @param data - Payload. Bigints are converted to strings.
 * @param status - HTTP status, default 200.
 * @returns The response.
 */
export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(
    { ok: true, ...(jsonSafe(data) as Record<string, unknown>) },
    { status },
  );
}

/**
 * A failure response.
 *
 * @param message - Safe, human-readable explanation.
 * @param status - HTTP status, default 400.
 * @param extra - Additional safe fields.
 * @returns The response.
 */
export function fail(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    { ok: false, error: message, ...(jsonSafe(extra) as Record<string, unknown>) },
    { status },
  );
}

/**
 * Renders an unexpected exception without leaking internals.
 *
 * Full detail goes to the server log; the client gets the message only, with
 * any stack trace stripped.
 *
 * @param error - The caught value.
 * @param context - What was being attempted.
 * @returns A 500 response.
 */
export function serverError(error: unknown, context: string): NextResponse {
  console.error(`[api] ${context}:`, error);
  const message =
    error instanceof Error ? error.message.split("\n")[0] : String(error);
  return fail(`${context}: ${message}`, 500);
}
