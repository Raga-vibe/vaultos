"use client";

/**
 * Shared primitives.
 *
 * The rule that shapes all of these: state is never communicated by colour
 * alone. Every status carries a glyph and a word as well as a hue, so the
 * interface still works in greyscale, under a projector, or for the roughly
 * one in twelve men who cannot reliably separate the green from the red.
 */

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Semantic tones. Maps to the three verdict colours plus neutral. */
export type Tone = "approve" | "warn" | "reject" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  approve: "text-approve-400 border-approve-500/30 bg-approve-950/40",
  warn: "text-warn-400 border-warn-500/30 bg-warn-950/40",
  reject: "text-reject-400 border-reject-500/30 bg-reject-950/40",
  info: "text-info-500 border-info-500/30 bg-info-950/40",
  neutral: "text-ink-300 border-ink-700 bg-ink-800/60",
};

/** The glyph carried alongside every tone, so colour is never load-bearing. */
const TONE_GLYPH: Record<Tone, string> = {
  approve: "✓",
  warn: "!",
  reject: "×",
  info: "i",
  neutral: "·",
};

/** A surface. One hairline border, no glow, no gradient. */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={clsx(
        "rounded-lg border border-ink-700 bg-ink-900/80 backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** A section heading with an optional trailing element. */
export function SectionHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink-300">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-mute-1">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

/**
 * A status pill: glyph, then word, then colour — in that order of importance.
 *
 * @param tone - Semantic tone.
 * @param children - The word. Always present; never an icon on its own.
 */
export function Pill({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5",
        "font-mono text-[11px] uppercase tracking-wider",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden="true">{TONE_GLYPH[tone]}</span>
      {children}
    </span>
  );
}

/** A live dot with a matching label. The dot alone would not be enough. */
export function StatusDot({ tone, label }: { tone: Tone; label: string }) {
  const reduce = useReducedMotion();
  const colour = {
    approve: "bg-approve-500",
    warn: "bg-warn-500",
    reject: "bg-reject-500",
    info: "bg-info-500",
    neutral: "bg-ink-500",
  }[tone];

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {tone !== "neutral" && !reduce ? (
          <motion.span
            className={clsx("absolute inline-flex h-full w-full rounded-full", colour)}
            animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        <span className={clsx("relative inline-flex h-2 w-2 rounded-full", colour)} />
      </span>
      <span className="text-xs text-ink-300">{label}</span>
    </span>
  );
}

/** Monospace technical value — addresses, hashes, amounts, codes. */
export function Mono({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={clsx("font-mono tabular-nums", className)}>
      {children}
    </span>
  );
}

/**
 * Copies a value and confirms it.
 *
 * Confirmation is a word, not just a tick — the same accessibility rule as
 * everything else here.
 */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={`${label}: ${value}`}
      className={clsx(
        "rounded border border-ink-700 px-2 py-1 font-mono text-[11px]",
        "text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100",
        copied && "border-approve-500/40 text-approve-400",
        className,
      )}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

/**
 * A number that counts to its value.
 *
 * Only used where a change in the figure is itself information — a balance
 * moving after an execution. Static figures are rendered statically; animating
 * every number would make the screen harder to read, not easier.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState<string | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = Number(previous.current.replace(/,/g, ""));
    const to = Number(value.replace(/,/g, ""));
    previous.current = value;

    if (reduce || !Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      return;
    }

    const decimals = (value.split(".")[1] ?? "").length;
    const start = performance.now();
    const duration = 650;
    let frame = 0;

    // Every setState below runs inside a requestAnimationFrame callback, not
    // in the effect body — so this drives an animation rather than cascading
    // a render on mount.
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      if (t < 1) {
        setAnimated(
          current.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
        );
        frame = requestAnimationFrame(tick);
      } else {
        setAnimated(null);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return (
    <span className={clsx("tabular-nums", className)}>{animated ?? value}</span>
  );
}

/** A loading placeholder that holds the shape of what is coming. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded bg-ink-800", className)}
      aria-hidden="true"
    />
  );
}

/**
 * A SYSTEM failure — something broke.
 *
 * Deliberately amber, never red, and deliberately headed "System error".
 *
 * Red in this product means one thing only: a policy refusal. A refusal is a
 * correct outcome — the safety system doing exactly its job — and if a broken
 * network request wore the same colour and the same shape, the product's most
 * important moment would read as a bug. So the two are separated at the level
 * of colour, glyph and wording, and this component is for the bug.
 */
export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-warn-500/35 bg-warn-950/30 p-4"
    >
      <div className="flex items-start gap-2">
        <span className="font-mono text-xs text-warn-400" aria-hidden="true">
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-warn-400">
            System error — this is not a policy decision
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-mute-1">
            Something failed on the way to an answer. Nothing was decided and
            nothing moved.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-ink-300">
            {message}
          </p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-ink-600 px-2.5 py-1 text-xs text-ink-200 hover:border-ink-400"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

/**
 * A policy refusal, presented as what it is: a success.
 *
 * Section of the product that matters most, and the easiest one to get wrong.
 * A refusal is not an error state — it is the single observable proof that
 * the boundary is real. So it never borrows the vocabulary of failure: no
 * "error", no "failed", no apology, no retry button offering to try again
 * until it works. It states the outcome, names the rule, and says plainly
 * that the system behaved correctly.
 */
export function SafetyDecision({
  headline,
  children,
}: {
  headline: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-reject-500/35 bg-reject-950/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="reject">Refused</Pill>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-approve-400">
          ✓ Safety decision — working as designed
        </span>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-100">{headline}</p>
      {children}
    </div>
  );
}

/** A labelled value, the workhorse row of this interface. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-mute-1">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink-100">{children}</dd>
      {hint ? <p className="mt-0.5 text-[11px] text-mute-2">{hint}</p> : null}
    </div>
  );
}

/** Primary action button with explicit disabled and busy states. */
export function Button({
  children,
  onClick,
  disabled,
  busy,
  tone = "neutral",
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: Tone;
  type?: "button" | "submit";
  className?: string;
}) {
  const toneClass =
    tone === "approve"
      ? "border-approve-500/40 text-approve-400 hover:border-approve-500 hover:bg-approve-950/50"
      : tone === "reject"
        ? "border-reject-500/40 text-reject-400 hover:border-reject-500"
        : "border-ink-600 text-ink-100 hover:border-ink-400 hover:bg-ink-800";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded border px-3.5 py-2",
        "text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent",
        toneClass,
        className,
      )}
    >
      {busy ? (
        <span
          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

/** Fades content in on mount. The one ambient motion used across the app. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
