/**
 * Store selection.
 *
 * Supabase when both credentials are present and non-placeholder; memory
 * otherwise. The choice is made once per process and reported by /api/health,
 * because "which database am I actually writing to" should never be a guess.
 */

import { assertServer } from "../server-guard";
import { createMemoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

assertServer("lib/store/index.ts");

const CACHE_KEY = Symbol.for("agentvault.store");

/**
 * True when a value looks like a real setting rather than a leftover
 * placeholder from .env.example.
 *
 * @param value - The environment value.
 * @returns Whether it is usable.
 */
function isConfigured(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim();
  if (v === "") return false;
  return !/^(placeholder|changeme|your[-_]?|todo|xxx)/i.test(v);
}

/**
 * Returns the active store, constructing it once.
 *
 * @returns The Store.
 */
export function getStore(): Store {
  const g = globalThis as unknown as Record<symbol, Store | undefined>;
  if (g[CACHE_KEY]) return g[CACHE_KEY];

  const useSupabase =
    isConfigured(process.env.SUPABASE_URL) &&
    isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY);

  g[CACHE_KEY] = useSupabase ? createSupabaseStore() : createMemoryStore();
  return g[CACHE_KEY];
}

/** Clears the cached store. Tests only. */
export function resetStoreForTests(): void {
  const g = globalThis as unknown as Record<symbol, Store | undefined>;
  delete g[CACHE_KEY];
}

export type { Store } from "./types";
