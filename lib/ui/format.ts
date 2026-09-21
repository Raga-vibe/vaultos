/**
 * Display formatting.
 *
 * Client-safe: imports nothing from the server tree and reads no environment.
 *
 * Atomic amounts arrive from the API as strings precisely because they can
 * exceed Number.MAX_SAFE_INTEGER. Every function here works on BigInt and
 * strings; none of them routes a balance through a float on its way to the
 * screen. A display value that disagrees with the chain is a bug even when it
 * is only cosmetic, because it is the number a person will act on.
 */

/**
 * Formats an atomic amount as a decimal string.
 *
 * @param atomic - Amount in atomic units, as a string or bigint.
 * @param decimals - The token's decimal places.
 * @param maxFractionDigits - Trim the fraction to at most this many digits.
 * @returns A grouped decimal string, e.g. "1,234.56".
 */
export function formatAtomic(
  atomic: string | bigint | null | undefined,
  decimals: number,
  maxFractionDigits = 6,
): string {
  if (atomic === null || atomic === undefined) return "—";

  let value: bigint;
  try {
    value = typeof atomic === "bigint" ? atomic : BigInt(atomic);
  } catch {
    return "—";
  }

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toString();
  const fraction = (abs % base).toString().padStart(decimals, "0");

  const trimmed = fraction
    .slice(0, Math.max(0, maxFractionDigits))
    .replace(/0+$/, "");

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${trimmed ? `.${trimmed}` : ""}`;
}

/**
 * Shortens an address for display while keeping it recognisable.
 *
 * Keeps enough of both ends that a person can verify it against a wallet, and
 * the full value is always available through the copy control beside it.
 *
 * @param address - The full address.
 * @param lead - Characters to keep after 0x.
 * @param tail - Characters to keep at the end.
 * @returns The truncated form.
 */
export function truncateAddress(
  address: string | null | undefined,
  lead = 6,
  tail = 4,
): string {
  if (!address) return "—";
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead + 2)}…${address.slice(-tail)}`;
}

/**
 * Renders basis points as a percentage.
 *
 * @param bps - Basis points. 412 = 4.12%.
 * @returns e.g. "4.12%".
 */
export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

export function explainViolation(code: string): string {
  const table: Record<string, string> = {
    ALLOCATION_EXCEEDS_CAP: "Over the per-action allocation cap",
    RISK_ABOVE_MAX: "Riskier than the policy allows",
    LIQUIDITY_BELOW_MIN: "Less liquid than the policy allows",
    LEVERAGE_NOT_ALLOWED: "Uses leverage, which the policy forbids",
    UNSUPPORTED_CHAIN: "Wrong chain",
    NON_POSITIVE_AMOUNT: "Amount must be greater than zero",
    INSUFFICIENT_BALANCE: "More than the wallet holds",
    ZERO_BALANCE: "Wallet is empty",
    TOTAL_EXPOSURE_EXCEEDED: "Would push total exposure over the ceiling",
    RESERVE_BREACHED: "Would dip below the reserve floor",
    DAILY_ACTION_LIMIT_REACHED: "Daily action limit already reached",
    DAILY_DEPLOY_CAP_EXCEEDED: "Over the rolling 24-hour deployment cap",
    COOLDOWN_ACTIVE: "Cooldown since the last action has not elapsed",
    PROTOCOL_NOT_ALLOWED: "Protocol is not on the allowlist",
    PROTOCOL_BLOCKED: "Protocol is on the blocklist",
    CONTEXT_REQUIRED: "A configured limit could not be evaluated",
    MALFORMED_POLICY: "The policy itself is not interpretable",
    MALFORMED_ACTION: "The action is not interpretable",
    MALFORMED_CONTEXT: "The stored history is not interpretable",
  };
  return table[code] ?? "Refused by policy";
}

/**
 * Formats an ISO timestamp for the audit trail.
 *
 * @param iso - ISO 8601 string.
 * @returns A compact local time string.
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Seconds rendered as a short human duration. */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(seconds % 3600 === 0 ? 0 : 1)}h`;
}
