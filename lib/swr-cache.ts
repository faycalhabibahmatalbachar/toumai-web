"use client";

/**
 * Cache server-state persistant de Toumai AI.
 *
 * Stratégie : stale-while-revalidate dans localStorage, cloisonnée par compte,
 * tolérante aux pannes et synchronisée entre onglets. CACHE-008 ajoute deux
 * garanties qui manquaient au cache historique :
 *
 * - l'identité de compte fait aussi partie de l'état React en mémoire, pas
 *   seulement de la clé localStorage ; un changement de compte ne peut donc
 *   jamais laisser l'ancien écran réutiliser sa valeur en RAM ;
 * - deux composants qui revalident la même clé au même instant partagent la
 *   même Promise réseau (singleflight navigateur), sans mettre le flux
 *   `/chat/stream` dans ce mécanisme.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { loadSession, SESSION_STORAGE_KEY } from "./api";
import { coalesceRequest } from "./cache-request-coalescer.mjs";

/* IMPORTANT hydratation : le serveur n'a ni session navigateur ni
 * localStorage. Le snapshot serveur est donc toujours `anon`; React adopte le
 * vrai propriétaire après hydratation via useSyncExternalStore. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PREFIX = "toumai:cache:";
/** V3 invalide les entrées antérieures lors du déploiement CACHE-008. */
const VERSION = 3;

interface Entry<T> {
  v: T;
  at: number;
  ver?: number;
  who?: string;
}

interface CachedState<T> {
  identity: string;
  data: T | null;
  fromCache: boolean;
  loading: boolean;
  error: string | null;
}

/** Identifiant logique du compte. Ce n'est jamais partagé entre comptes. */
function owner(): string {
  return loadSession()?.user_id || "anon";
}

function fullKeyFor(scope: string, key: string): string {
  return `${PREFIX}${scope}:${key}`;
}

function fullKey(key: string): string {
  return fullKeyFor(owner(), key);
}

function identityFor(scope: string, key: string): string {
  return `${scope}:${key}`;
}

function neutralState<T>(identity: string): CachedState<T> {
  return {
    identity,
    data: null,
    fromCache: false,
    loading: true,
    error: null,
  };
}

// ── Identité de session réactive ───────────────────────────────────────────
// `storage` ne se déclenche pas dans l'onglet qui écrit. AuthProvider appelle
// cachePurge() à chaque login/logout : la purge émet donc aussi ce signal local.
type OwnerListener = () => void;
const ownerListeners = new Set<OwnerListener>();

function notifyOwnerChange(): void {
  ownerListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function subscribeOwner(fn: OwnerListener): () => void {
  if (typeof window === "undefined") return () => {};
  ownerListeners.add(fn);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_STORAGE_KEY) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    ownerListeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function getOwnerSnapshot(): string {
  return owner();
}

function getServerOwnerSnapshot(): string {
  return "anon";
}

function useCacheOwner(): string {
  return useSyncExternalStore(subscribeOwner, getOwnerSnapshot, getServerOwnerSnapshot);
}

// ── Lecture / écriture ─────────────────────────────────────────────────────
function cacheReadFor<T>(scope: string, key: string): Entry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(fullKeyFor(scope, key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (!entry || typeof entry.at !== "number") return null;
    if (entry.ver !== VERSION) return null;

    // Une entrée physiquement présente mais sans valeur est corrompue : MISS.
    if (!Object.prototype.hasOwnProperty.call(entry, "v") || entry.v === undefined) {
      return null;
    }
    if (entry.who && entry.who !== scope) return null;
    return entry;
  } catch {
    return null;
  }
}

export function cacheRead<T>(key: string): Entry<T> | null {
  return cacheReadFor<T>(owner(), key);
}

export function cacheSeed<T>(key: string, maxAgeMs = Infinity): T | null {
  const entry = cacheRead<T>(key);
  if (!entry) return null;
  return Date.now() - entry.at <= maxAgeMs ? entry.v : null;
}

/** Retire les entrées les plus anciennes jusqu'à libérer de la place. */
function evictOldest(count: number): void {
  if (typeof window === "undefined") return;
  const entries: { k: string; at: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    let at = 0;
    try {
      at = (JSON.parse(localStorage.getItem(key) || "{}") as Entry<unknown>).at || 0;
    } catch {
      at = 0;
    }
    entries.push({ k: key, at });
  }
  entries.sort((a, b) => a.at - b.at);
  for (const entry of entries.slice(0, Math.max(1, count))) {
    try {
      localStorage.removeItem(entry.k);
    } catch {}
  }
}

function cacheWriteFor<T>(scope: string, key: string, value: T): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ v: value, at: Date.now(), ver: VERSION, who: scope });
  const storageKey = fullKeyFor(scope, key);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(storageKey, payload);
      notifyLocal(storageKey);
      return;
    } catch {
      evictOldest(4 * (attempt + 1));
    }
  }
  // Le cache est une optimisation : jamais une condition de fonctionnement.
}

export function cacheWrite<T>(key: string, value: T): void {
  cacheWriteFor(owner(), key, value);
}

export function cacheRemove(key: string): void {
  if (typeof window === "undefined") return;
  const storageKey = fullKey(key);
  try {
    localStorage.removeItem(storageKey);
    notifyLocal(storageKey);
  } catch {}
}

/**
 * Purge le cache applicatif.
 * Sans préfixe : toutes les identités — utilisé lors d'un login/logout.
 * Avec préfixe : seulement les clés correspondantes du compte courant.
 */
export function cachePurge(prefix?: string): void {
  if (typeof window === "undefined") return;
  const target = prefix === undefined ? PREFIX : `${PREFIX}${owner()}:${prefix}`;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(target)) localStorage.removeItem(key);
    }
  } catch {}
  notifyPurge();
  if (prefix === undefined) notifyOwnerChange();
}

// ── Diffusion locale / inter-onglets ───────────────────────────────────────
// null signifie « purge » ; une clé concrète signifie « cette entrée change ».
type Listener = (storageKey: string | null) => void;
const listeners = new Set<Listener>();

function notifyLocal(storageKey: string): void {
  listeners.forEach((fn) => {
    try {
      fn(storageKey);
    } catch {}
  });
}

function notifyPurge(): void {
  listeners.forEach((fn) => {
    try {
      fn(null);
    } catch {}
  });
}

function onCacheChangeFor(scope: string, key: string, fn: () => void): () => void {
  const storageKey = fullKeyFor(scope, key);
  const local: Listener = (changed) => {
    if (changed === null || changed === storageKey) fn();
  };
  listeners.add(local);

  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === SESSION_STORAGE_KEY) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(local);
    window.removeEventListener("storage", onStorage);
  };
}

/** S'abonne aux changements de la clé pour le propriétaire courant. */
export function onCacheChange(key: string, fn: () => void): () => void {
  return onCacheChangeFor(owner(), key, fn);
}

/** Seed hydration-safe, également réinitialisé lors d'un changement de compte. */
export function useCacheSeed<T>(key: string, apply: (value: T) => void): void {
  const scope = useCacheOwner();
  const identity = identityFor(scope, key);
  const appliedIdentityRef = useRef<string | null>(null);

  useIsoLayoutEffect(() => {
    if (appliedIdentityRef.current === identity) return;
    appliedIdentityRef.current = identity;
    const entry = cacheReadFor<T>(scope, key);
    if (entry) apply(entry.v);
  }, [apply, identity, key, scope]);
}

interface UseCachedOptions {
  /** Ne déclenche pas la revalidation tant que false. */
  enabled?: boolean;
  /** Fraîcheur : 0 = revalider systématiquement. */
  ttlMs?: number;
  /** Revalider au retour onglet/réseau. */
  revalidateOnFocus?: boolean;
}

interface UseCachedResult<T> {
  data: T | null;
  fromCache: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook SWR server-state.
 *
 * La réponse affichée appartient toujours à `scope + key`. Une Promise lancée
 * sous le compte A continue éventuellement après un logout, mais elle écrit
 * uniquement dans le namespace A et ne peut jamais mettre à jour l'état du
 * compte B. Les lectures identiques déjà en vol sont mutualisées par cette
 * même identité.
 */
export function useCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: UseCachedOptions,
): UseCachedResult<T> {
  const enabled = opts?.enabled ?? true;
  const ttlMs = opts?.ttlMs ?? 0;
  const revalidateOnFocus = opts?.revalidateOnFocus ?? true;
  const scope = useCacheOwner();
  const identity = identityFor(scope, key);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const [state, setState] = useState<CachedState<T>>(() => neutralState<T>(""));
  // Ne JAMAIS rendre une valeur portant l'identité précédente, même pendant
  // le rendu qui précède le layout-effect de resynchronisation.
  const visibleState = state.identity === identity ? state : neutralState<T>(identity);

  useIsoLayoutEffect(() => {
    const entry = cacheReadFor<T>(scope, key);
    setState((current) => {
      if (current.identity === identity && current.data !== null) return current;
      return entry
        ? {
            identity,
            data: entry.v,
            fromCache: true,
            loading: false,
            error: null,
          }
        : neutralState<T>(identity);
    });
  }, [identity, key, scope]);

  const revalidate = useCallback(async () => {
    const requestedIdentity = identity;
    const requestedScope = scope;
    // Capture le fetcher au départ : un changement de compte/props pendant
    // l'attente ne doit pas transformer rétroactivement cette requête.
    const runFetcher = fetcherRef.current;
    try {
      const value = await coalesceRequest<T>(requestedIdentity, runFetcher);
      cacheWriteFor(requestedScope, key, value);
      setState((current) =>
        current.identity === requestedIdentity
          ? {
              ...current,
              data: value,
              fromCache: false,
              loading: false,
              error: null,
            }
          : current,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chargement impossible";
      setState((current) =>
        current.identity === requestedIdentity
          ? {
              ...current,
              loading: false,
              error: current.data ? null : message,
            }
          : current,
      );
    }
  }, [identity, key, scope, setState]);

  useEffect(() => {
    if (!enabled) return;
    const entry = cacheReadFor<T>(scope, key);
    if (entry && ttlMs > 0 && Date.now() - entry.at <= ttlMs) return;
    void revalidate();
  }, [enabled, key, revalidate, scope, ttlMs]);

  useEffect(() => {
    if (!enabled) return;
    return onCacheChangeFor(scope, key, () => {
      const entry = cacheReadFor<T>(scope, key);
      setState((current) => {
        if (current.identity !== identity) return current;
        if (!entry) return neutralState<T>(identity);
        return {
          identity,
          data: entry.v,
          fromCache: true,
          loading: false,
          error: null,
        };
      });
    });
  }, [enabled, identity, key, scope]);

  useEffect(() => {
    if (!enabled || !revalidateOnFocus) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled, revalidateOnFocus, revalidate]);

  return {
    data: visibleState.data,
    fromCache: visibleState.fromCache,
    loading: visibleState.loading && enabled,
    error: visibleState.error,
    refresh: revalidate,
  };
}
