"use client";

/**
 * The policy: what the agent is allowed to do.
 *
 * Every rule is visible at once. There is no "advanced" drawer, because a
 * boundary the user has forgotten about is not a boundary they chose — and
 * the whole product rests on the user having chosen these.
 *
 * The frontend is a control surface and nothing more. It does not validate in
 * order to decide; it validates in order to be pleasant, and then sends the
 * whole policy to PUT /api/policy, which is the only thing that can accept or
 * refuse it. When the server refuses, its own words are shown verbatim.
 */

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  ErrorNote,
  Mono,
  Pill,
  SectionHeader,
  Skeleton,
} from "../ui/primitives";
import { formatAtomic, formatSeconds } from "../../lib/ui/format";
import { PLAIN_RULES } from "../../lib/ui/plain";
import { api, type Band, type Policy } from "../../lib/ui/api";

const BANDS: Band[] = ["LOW", "MEDIUM", "HIGH"];

/** One row of the policy display. */
function Rule({
  field,
  value,
  tone = "neutral",
  children,
}: {
  /** The policy field name. Looked up in PLAIN_RULES for readable copy. */
  field: keyof typeof PLAIN_RULES;
  value: string;
  tone?: "neutral" | "approve" | "warn" | "reject";
  children?: React.ReactNode;
}) {
  const plain = PLAIN_RULES[field];

  return (
    <div className="border-b border-ink-800 px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[13px] font-medium text-ink-100">
          {plain.title}
        </span>
        <Mono
          className={clsx(
            "text-sm",
            tone === "approve" && "text-approve-400",
            tone === "warn" && "text-warn-400",
            tone === "reject" && "text-reject-400",
            tone === "neutral" && "text-ink-100",
          )}
        >
          {value}
        </Mono>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-mute-1">
        {plain.question}
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-mute-2">
        {plain.why}
      </p>
      {/* The exact field name, for anyone checking this against the code. */}
      <Mono className="mt-1.5 block text-[10px] text-mute-3">{field}</Mono>
      {children}
    </div>
  );
}

/**
 * A heading that divides the rule set into four groups.
 *
 * Twelve rules in one undifferentiated column is a wall, and a wall is
 * something people scroll past rather than read. The groups answer four
 * different questions — how much, how it behaves, how much in total, and
 * where — so a reader looking for one of them can stop looking at the rest.
 */
function GroupHeading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="border-b border-ink-800 bg-ink-850/50 px-4 py-2.5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-200">
        {title}
      </h3>
      <p className="mt-0.5 text-[11px] leading-snug text-mute-1">{blurb}</p>
    </div>
  );
}

/** A labelled control in the editor. */
function Control({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ink-800 px-4 py-3.5 last:border-b-0">
      <label className="block text-[13px] font-medium text-ink-100">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-[11px] text-mute-2">{hint}</p> : null}
    </div>
  );
}

/** Segmented choice — used where the value is one of a small fixed set. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="inline-flex rounded border border-ink-700 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={clsx(
            "rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
            value === o
              ? "bg-ink-700 text-ink-50"
              : "text-mute-1 hover:text-ink-200",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** A percentage slider with its value shown as text beside it. */
function PercentSlider({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded bg-ink-700 accent-approve-500"
      />
      <Mono className="w-12 text-right text-sm text-ink-100">{value}%</Mono>
    </div>
  );
}

/** An on/off switch that also says which state it is in. */
function Toggle({
  checked,
  onChange,
  onLabel,
  offLabel,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "inline-flex items-center gap-2.5 rounded border px-3 py-1.5 transition-colors",
        checked
          ? "border-approve-500/40 bg-approve-950/40 text-approve-400"
          : "border-ink-700 bg-ink-850 text-mute-1",
      )}
    >
      <span
        className={clsx(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-approve-500/60" : "bg-ink-600",
        )}
        aria-hidden="true"
      >
        <span
          className={clsx(
            "absolute top-0.5 h-3 w-3 rounded-full bg-ink-50 transition-all",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider">
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}

/** A comma-separated list edited as text, sent as an array. */
function ChipsInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string[] | undefined;
  onChange: (v: string[] | undefined) => void;
  placeholder: string;
  id: string;
}) {
  const enabled = value !== undefined;

  return (
    <div className="space-y-2">
      <Toggle
        id={`${id}-enabled`}
        checked={enabled}
        onChange={(on) => onChange(on ? [] : undefined)}
        onLabel="In force"
        offLabel="Not set"
      />
      {enabled ? (
        <>
          <input
            id={id}
            type="text"
            defaultValue={value.join(", ")}
            placeholder={placeholder}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              )
            }
            className="w-full rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 font-mono text-xs text-ink-100 placeholder:text-mute-3"
          />
          {value && value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {value.map((p) => (
                <span
                  key={p}
                  className="rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-warn-400">
              ! Empty list — this permits nothing.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

/** An optional numeric rule: a toggle plus a value. */
function OptionalNumber({
  value,
  onChange,
  min = 0,
  max,
  suffix,
  id,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  suffix?: string;
  id: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toggle
        id={`${id}-enabled`}
        checked={value !== undefined}
        onChange={(on) => onChange(on ? (min || 0) : undefined)}
        onLabel="In force"
        offLabel="Not set"
      />
      {value !== undefined ? (
        <span className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-sm text-ink-100"
          />
          {suffix ? (
            <span className="font-mono text-[11px] text-mute-2">{suffix}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function PolicyPanel({
  policy,
  isDefault,
  loading,
  error,
  onSaved,
  onRetry,
  editable = true,
  compact = false,
  headingLevel = "h2",
}: {
  policy: Policy | null;
  isDefault: boolean;
  loading: boolean;
  error: string | null;
  onSaved?: (p: Policy) => void;
  onRetry?: () => void;
  editable?: boolean;
  /**
   * Show only the five always-enforced rules.
   *
   * The overview is meant to be readable in one screen. Repeating all twelve
   * rules there pushes the wallet, the pipeline and the activity feed below
   * the fold, so the summary shows the five that are always in force and
   * links to the rest.
   */
  compact?: boolean;
  /** h1 on the Policy page, which this heading opens; h2 in the summary. */
  headingLevel?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setSavedAt(null), 2600);
    return () => clearTimeout(t);
  }, [savedAt]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(policy),
    [draft, policy],
  );

  if (error) return <ErrorNote message={error} onRetry={onRetry} />;

  if (loading || !policy) {
    return (
      <Card className="p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full" />
        ))}
      </Card>
    );
  }

  /** Sends the whole draft. The server decides whether it is acceptable. */
  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { policy: saved } = await api.savePolicy(draft);
      onSaved?.(saved);
      setEditing(false);
      setSavedAt(Date.now());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const p = editing && draft ? draft : policy;
  const set = <K extends keyof Policy>(k: K, v: Policy[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="space-y-3">
      <SectionHeader
        as={headingLevel}
        title="Your policy rules"
        subtitle="The boundaries you set. Checked on every single move, by code that has never read a word the AI wrote and cannot be argued with."
        trailing={
          editable && !compact ? (
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {savedAt ? (
                  <motion.span
                    initial={reduce ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[11px] text-approve-400"
                  >
                    ✓ Saved
                  </motion.span>
                ) : null}
              </AnimatePresence>

              {editing ? (
                <>
                  <Button
                    onClick={() => {
                      setDraft(policy);
                      setEditing(false);
                      setSaveError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    tone="approve"
                    busy={saving}
                    disabled={!dirty}
                    onClick={save}
                  >
                    Save policy
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setDraft(policy);
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {isDefault && !editing ? (
        <p className="rounded border border-ink-700 bg-ink-850/60 px-3 py-2 text-[12px] text-mute-1">
          <span aria-hidden="true">· </span>
          No policy has been saved yet. These are the conservative defaults —
          <Mono className="text-ink-300"> autoExecute</Mono> is off, so nothing
          moves without a person saying so.
        </p>
      ) : null}

      {saveError ? <ErrorNote message={saveError} /> : null}

      <Card>
        {!editing || !draft ? (
          <>
            <GroupHeading
              title="Core limits"
              blurb="The three questions asked on every single move."
            />
            <Rule
              field="maxAllocationPercent"
              value={`${p.maxAllocationPercent}%`}
            />
            <Rule
              field="maxRisk"
              value={p.maxRisk}
              tone={p.maxRisk === "HIGH" ? "warn" : "neutral"}
            />
            <Rule field="minLiquidity" value={p.minLiquidity} />
            <GroupHeading
              title="Behaviour"
              blurb="What the agent may do without you, and what it may never do."
            />
            <Rule
              field="leverageAllowed"
              value={p.leverageAllowed ? "ALLOWED" : "NEVER"}
              tone={p.leverageAllowed ? "warn" : "approve"}
            />
            <Rule
              field="autoExecute"
              value={p.autoExecute ? "ON ITS OWN" : "ASKS YOU FIRST"}
              tone={p.autoExecute ? "warn" : "approve"}
            />
            {compact ? null : (
              <>
            <GroupHeading
              title="Exposure controls"
              blurb="Ceilings across everything, and over time — not just per move."
            />
            <Rule
              field="maxTotalExposurePercent"
              value={
                p.maxTotalExposurePercent === undefined
                  ? "NOT SET"
                  : `${p.maxTotalExposurePercent}%`
              }
            />
            <Rule
              field="minReserveAtomic"
              value={
                p.minReserveAtomic === undefined
                  ? "NOT SET"
                  : formatAtomic(p.minReserveAtomic, 6)
              }
            />
            <Rule
              field="maxActionsPerDay"
              value={
                p.maxActionsPerDay === undefined
                  ? "NOT SET"
                  : `${p.maxActionsPerDay} a day`
              }
            />
            <Rule
              field="maxDailyDeployedPercent"
              value={
                p.maxDailyDeployedPercent === undefined
                  ? "NOT SET"
                  : `${p.maxDailyDeployedPercent}%`
              }
            />
            <Rule
              field="cooldownSeconds"
              value={
                p.cooldownSeconds === undefined
                  ? "NOT SET"
                  : formatSeconds(p.cooldownSeconds)
              }
            />
            <GroupHeading
              title="Protocol controls"
              blurb="Where the money is allowed to go, and where it never may."
            />
            <Rule
              field="allowedProtocols"
              value={
                p.allowedProtocols === undefined
                  ? "NOT SET"
                  : p.allowedProtocols.length === 0
                    ? "NONE ALLOWED"
                    : `${p.allowedProtocols.length} listed`
              }
            >
              {p.allowedProtocols && p.allowedProtocols.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.allowedProtocols.map((x) => (
                    <Pill key={x} tone="neutral">
                      {x}
                    </Pill>
                  ))}
                </div>
              ) : null}
            </Rule>
            <Rule
              field="blockedProtocols"
              value={
                p.blockedProtocols === undefined
                  ? "NOT SET"
                  : `${p.blockedProtocols.length} listed`
              }
            >
              {p.blockedProtocols && p.blockedProtocols.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.blockedProtocols.map((x) => (
                    <Pill key={x} tone="reject">
                      {x}
                    </Pill>
                  ))}
                </div>
              ) : null}
            </Rule>
              </>
            )}
          </>
        ) : (
          <>
            <GroupHeading
              title="Core limits"
              blurb="The three questions asked on every single move."
            />
            <Control
              label="Biggest single move"
              hint="How much of your money can go into one thing at once."
            >
              <PercentSlider
                id="maxAllocationPercent"
                value={draft.maxAllocationPercent}
                onChange={(n) => set("maxAllocationPercent", n)}
              />
            </Control>

            <Control label="Riskiest thing allowed" hint="Anything riskier is refused outright.">
              <Segmented
                name="Max risk"
                options={BANDS}
                value={draft.maxRisk}
                onChange={(v) => set("maxRisk", v)}
              />
            </Control>

            <Control label="Getting your money out" hint="HIGH means you can withdraw any time.">
              <Segmented
                name="Min liquidity"
                options={BANDS}
                value={draft.minLiquidity}
                onChange={(v) => set("minLiquidity", v)}
              />
            </Control>

            <GroupHeading
              title="Behaviour"
              blurb="What the agent may do without you, and what it may never do."
            />
            <Control
              label="Borrowing to invest"
              hint="Borrowing multiplies losses as well as gains."
            >
              <Toggle
                id="leverageAllowed"
                checked={draft.leverageAllowed}
                onChange={(v) => set("leverageAllowed", v)}
                onLabel="Allowed"
                offLabel="Not allowed"
              />
            </Control>

            <Control
              label="Acting without asking"
              hint="When off, you confirm every move yourself."
            >
              <Toggle
                id="autoExecute"
                checked={draft.autoExecute}
                onChange={(v) => set("autoExecute", v)}
                onLabel="On"
                offLabel="Off"
              />
            </Control>

            <GroupHeading
              title="Exposure controls"
              blurb="Ceilings across everything, and over time — not just per move."
            />
            <Control
              label="Most invested at once"
              hint="Across everything, not per move."
            >
              <OptionalNumber
                id="maxTotalExposurePercent"
                value={draft.maxTotalExposurePercent}
                onChange={(v) => set("maxTotalExposurePercent", v)}
                max={100}
                suffix="%"
              />
            </Control>

            <Control
              label="Untouchable reserve"
              hint="Money that must always stay put. 1 USDC = 1000000."
            >
              <div className="flex flex-wrap items-center gap-3">
                <Toggle
                  id="minReserveAtomic-enabled"
                  checked={draft.minReserveAtomic !== undefined}
                  onChange={(on) =>
                    set("minReserveAtomic", on ? "0" : undefined)
                  }
                  onLabel="In force"
                  offLabel="Not set"
                />
                {draft.minReserveAtomic !== undefined ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.minReserveAtomic}
                    onChange={(e) =>
                      set(
                        "minReserveAtomic",
                        e.target.value.replace(/[^\d]/g, ""),
                      )
                    }
                    className="w-40 rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-sm text-ink-100"
                  />
                ) : null}
              </div>
            </Control>

            <Control label="Moves per day" hint="Counted over a rolling 24 hours.">
              <OptionalNumber
                id="maxActionsPerDay"
                value={draft.maxActionsPerDay}
                onChange={(v) => set("maxActionsPerDay", v)}
                suffix="actions"
              />
            </Control>

            <Control
              label="Spending limit per day"
              hint="However the agent splits it up."
            >
              <OptionalNumber
                id="maxDailyDeployedPercent"
                value={draft.maxDailyDeployedPercent}
                onChange={(v) => set("maxDailyDeployedPercent", v)}
                max={100}
                suffix="%"
              />
            </Control>

            <Control label="Pause between moves" hint="Gives you time to notice and step in.">
              <OptionalNumber
                id="cooldownSeconds"
                value={draft.cooldownSeconds}
                onChange={(v) => set("cooldownSeconds", v)}
                suffix="seconds"
              />
            </Control>

            <GroupHeading
              title="Protocol controls"
              blurb="Where the money is allowed to go, and where it never may."
            />
            <Control
              label="Approved places only"
              hint="Comma separated. An empty list allows nothing at all."
            >
              <ChipsInput
                id="allowedProtocols"
                value={draft.allowedProtocols}
                onChange={(v) => set("allowedProtocols", v)}
                placeholder="Testnet Stable Reserve, Testnet Balanced Pool"
              />
            </Control>

            <Control
              label="Banned places"
              hint="Comma separated. Always wins over the approved list."
            >
              <ChipsInput
                id="blockedProtocols"
                value={draft.blockedProtocols}
                onChange={(v) => set("blockedProtocols", v)}
                placeholder="Testnet Carry Desk"
              />
            </Control>
          </>
        )}
      </Card>
    </div>
  );
}
