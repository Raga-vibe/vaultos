"use client";

/**
 * The VaultOS brand.
 *
 * One mark, one wordmark, used everywhere the product names itself. Keeping
 * them here means the identity has a single definition rather than a string
 * copied into four files that drift apart.
 *
 * The mark is a vault door seen head-on: a rounded enclosure, a dial, and a
 * single locking bolt at the top. It is drawn rather than imported so it
 * inherits the interface's own colours, stays crisp at 14px, and adds no
 * dependency.
 *
 * The wordmark sets "OS" in the accent green. The product is not a wallet —
 * it is the layer that governs one — and the split spelling carries that
 * without needing a tagline beside it.
 */

import clsx from "clsx";

/**
 * The vault mark.
 *
 * @param size - Edge length in pixels.
 * @param className - Extra classes for the svg.
 */
export function BrandMark({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={clsx("shrink-0", className)}
    >
      {/* Enclosure */}
      <rect
        x="1.25"
        y="1.25"
        width="21.5"
        height="21.5"
        rx="5.5"
        className="stroke-approve-500/70"
        strokeWidth="1.5"
      />
      {/* Dial */}
      <circle
        cx="12"
        cy="12"
        r="5"
        className="stroke-approve-500"
        strokeWidth="1.5"
      />
      {/* Locking bolt — the boundary, closed */}
      <path
        d="M12 4.25V7"
        className="stroke-approve-500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.35" className="fill-approve-400" />
    </svg>
  );
}

/**
 * The wordmark.
 *
 * @param className - Extra classes for the text.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("font-semibold tracking-tight text-ink-50", className)}>
      Vault<span className="text-approve-400">OS</span>
    </span>
  );
}

/** Mark and wordmark together, as used in the navigation. */
export function Brand({
  size = 18,
  textClassName,
}: {
  size?: number;
  textClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={size} />
      <Wordmark className={textClassName} />
    </span>
  );
}
