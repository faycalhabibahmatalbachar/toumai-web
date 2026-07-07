"use client";

/** Cache intelligent persistant — stratégie stale-while-revalidate sur
 * localStorage : chaque page affiche INSTANTANÉMENT les dernières données
 * connues (zéro squelette au retour), puis revalide en arrière-plan et met
 * à jour l'écran + le cache. Un échec réseau conserve silencieusement les
 * données en cache au lieu de vider la page. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* IMPORTANT hydratation : les pages sont pré-rendues SANS localStorage. Lire
 * le cache pendant le rendu initial (useState(() => cacheSeed(...))) fait
 * diverger le HTML serveur et le premier rendu client → erreur d'hydratation
 * React. La règle : état initial NEUTRE, puis seed via useLayoutEffect —
 * il s'exécute après l'hydratation mais AVANT la peinture, donc l'utilisateur
 * voit quand même le cache instantanément, sans flash ni erreur. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PREFIX = "toumai:cache:";

interface Entry<T> {
  v: T;
  at: number;
}

/** Lit une entrée brute du cache (valeur + horodatage), null si absente. */
export function cacheRead<T>(key: string): Entry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    if (!e || typeof e.at !== "number") return null;
    return e;
  } catch {
    return null;
  }
}

/** Valeur en cache si plus récente que maxAgeMs (par défaut : toujours). */
export function cacheSeed<T>(key: string, maxAgeMs = Infinity): T | null {
  const e = cacheRead<T>(key);
  if (!e) return null;
  return Date.now() - e.at <= maxAgeMs ? e.v : null;
}

export function cacheWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, at: Date.now() }));
  } catch {
    // Quota plein : on purge le cache applicatif et on réessaie une fois.
    try {
      cachePurge();
      localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, at: Date.now() }));
    } catch {}
  }
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

/** Purge toutes les entrées du cache applicatif (option : sous-préfixe). */
export function cachePurge(prefix = ""): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) localStorage.removeItem(k);
    }
  } catch {}
}

/** Seed hydration-safe : applique la valeur en cache UNE fois, juste après
 * l'hydratation et avant la peinture. À utiliser à la place de
 * `useState(() => cacheSeed(key))` dans les composants pré-rendus. */
export function useCacheSeed<T>(key: string, apply: (value: T) => void): void {
  const appliedRef = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useIsoLayoutEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    const e = cacheRead<T>(key);
    if (e) applyRef.current(e.v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

interface UseCachedOptions {
  /** Ne déclenche pas la revalidation tant que false (ex. session absente). */
  enabled?: boolean;
  /** Fraîcheur : si le cache est plus jeune, la revalidation est différée
   * (0 = revalider systématiquement). */
  ttlMs?: number;
}

interface UseCachedResult<T> {
  data: T | null;
  /** true si les données affichées viennent du cache (revalidation en cours). */
  fromCache: boolean;
  /** true uniquement quand on n'a RIEN à afficher (premier chargement). */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Hook SWR : rend immédiatement la valeur en cache pour `key`, revalide en
 * arrière-plan via `fetcher`, persiste le résultat. Changer `key` bascule
 * instantanément sur le cache de la nouvelle clé. */
export function useCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: UseCachedOptions,
): UseCachedResult<T> {
  const enabled = opts?.enabled ?? true;
  const ttlMs = opts?.ttlMs ?? 0;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // État initial NEUTRE (identique au HTML pré-rendu) — le cache est appliqué
  // en layout-effect ci-dessous, après l'hydratation.
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    fromCache: boolean;
    loading: boolean;
    error: string | null;
  }>({ key, data: null, fromCache: false, loading: true, error: null });

  // Changement de clé (filtre, période…) : reset synchrone pour ne jamais
  // afficher les données de l'ancienne clé.
  if (state.key !== key) {
    setState({ key, data: null, fromCache: false, loading: true, error: null });
  }

  // Seed depuis le cache — avant peinture, donc affichage instantané sans
  // divergence d'hydratation.
  useIsoLayoutEffect(() => {
    const e = cacheRead<T>(key);
    if (!e) return;
    setState((s) =>
      s.key === key && s.data === null
        ? { ...s, data: e.v, fromCache: true, loading: false }
        : s,
    );
  }, [key]);

  const revalidate = useCallback(async () => {
    try {
      const v = await fetcherRef.current();
      cacheWrite(key, v);
      setState((s) =>
        s.key === key ? { ...s, data: v, fromCache: false, loading: false, error: null } : s,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chargement impossible";
      // Échec réseau : on garde les données en cache si on en a.
      setState((s) =>
        s.key === key ? { ...s, loading: false, error: s.data ? null : msg } : s,
      );
    }
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    const e = cacheRead<T>(key);
    if (e && ttlMs > 0 && Date.now() - e.at <= ttlMs) return; // encore frais
    revalidate();
  }, [key, enabled, ttlMs, revalidate]);

  return {
    data: state.data,
    fromCache: state.fromCache,
    loading: state.loading && enabled,
    error: state.error,
    refresh: revalidate,
  };
}
