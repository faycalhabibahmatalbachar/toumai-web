"use client";

/** Cache intelligent persistant — stratégie stale-while-revalidate sur
 * localStorage : chaque page affiche INSTANTANÉMENT les dernières données
 * connues (zéro squelette au retour), puis revalide en arrière-plan et met
 * à jour l'écran + le cache. Un échec réseau conserve silencieusement les
 * données en cache au lieu de vider la page.
 *
 * CE QUI LE REND RÉSISTANT
 * ------------------------
 * 1. CLOISONNÉ PAR COMPTE. Chaque entrée est rangée sous l'identifiant de
 *    l'utilisateur. Deux comptes sur le même navigateur ne peuvent pas se
 *    voir, même si une purge est oubliée quelque part — le cloisonnement ne
 *    dépend d'aucun appel à faire au bon moment.
 * 2. VERSIONNÉ. Un changement de forme des données invalide l'ancien cache au
 *    lieu de nourrir l'écran avec un objet qui n'a plus la bonne tête.
 * 3. ÉVICTION PAR ANCIENNETÉ. Quota plein : on retire les entrées les plus
 *    vieilles jusqu'à ce que ça rentre, au lieu de tout jeter et de renvoyer
 *    l'utilisateur à un écran vide.
 * 4. SYNCHRONISÉ ENTRE ONGLETS. Une écriture dans un onglet met à jour les
 *    autres, sans rechargement.
 * 5. REVALIDÉ AU BON MOMENT. Retour sur l'onglet, retour du réseau : les
 *    données se rafraîchissent d'elles-mêmes.
 * 6. TOLÉRANT AUX PANNES. Toute erreur de stockage (mode privé, quota, JSON
 *    corrompu) est absorbée : le cache est une accélération, jamais une
 *    dépendance. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadSession } from "./api";

/* IMPORTANT hydratation : les pages sont pré-rendues SANS localStorage. Lire
 * le cache pendant le rendu initial (useState(() => cacheSeed(...))) fait
 * diverger le HTML serveur et le premier rendu client → erreur d'hydratation
 * React. La règle : état initial NEUTRE, puis seed via useLayoutEffect —
 * il s'exécute après l'hydratation mais AVANT la peinture, donc l'utilisateur
 * voit quand même le cache instantanément, sans flash ni erreur. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const PREFIX = "toumai:cache:";
/** Incrémenter invalide TOUT l'ancien cache — à faire quand la forme des
 * données mises en cache change. */
const VERSION = 2;

interface Entry<T> {
  v: T;
  at: number;
  /** Version du format et propriétaire, vérifiés à la lecture. */
  ver?: number;
  who?: string;
}

/** Identifiant du compte auquel appartiennent les données mises en cache.
 * « anon » avant toute session : ces entrées-là ne survivront pas au login. */
function owner(): string {
  return loadSession()?.user_id || "anon";
}

function fullKey(key: string): string {
  return `${PREFIX}${owner()}:${key}`;
}

/** Lit une entrée brute du cache (valeur + horodatage), null si absente,
 * périmée par version, ou appartenant à un autre compte. */
export function cacheRead<T>(key: string): Entry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    if (!e || typeof e.at !== "number") return null;
    if (e.ver !== VERSION) return null;
    // Double garde : la clé porte déjà le propriétaire, mais un cache écrit
    // avant connexion ne doit pas être servi au compte qui se connecte.
    if (e.who && e.who !== owner()) return null;
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

/** Retire les entrées les plus anciennes du cache applicatif jusqu'à libérer
 * de la place. Tout jeter renverrait l'utilisateur à un écran vide alors
 * qu'une poignée d'entrées suffit à faire de la place. */
function evictOldest(count: number): void {
  const entries: { k: string; at: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    let at = 0;
    try {
      at = (JSON.parse(localStorage.getItem(k) || "{}") as Entry<unknown>).at || 0;
    } catch {
      at = 0; // illisible : candidat idéal à l'éviction
    }
    entries.push({ k, at });
  }
  entries.sort((a, b) => a.at - b.at);
  for (const e of entries.slice(0, Math.max(1, count))) {
    try {
      localStorage.removeItem(e.k);
    } catch {}
  }
}

export function cacheWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ v: value, at: Date.now(), ver: VERSION, who: owner() });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(fullKey(key), payload);
      notifyLocal(key);
      return;
    } catch {
      // Quota plein : on fait de la place par les plus vieilles entrées.
      evictOldest(4 * (attempt + 1));
    }
  }
  // Toujours impossible (mode privé, stockage désactivé) : on abandonne
  // silencieusement — le cache n'est jamais une condition d'affichage.
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(fullKey(key));
    notifyLocal(key);
  } catch {}
}

/** Purge le cache applicatif. Sans argument : tout, tous comptes confondus
 * (déconnexion). Avec un sous-préfixe : seulement les clés du compte courant
 * qui commencent par ce préfixe. */
export function cachePurge(prefix?: string): void {
  if (typeof window === "undefined") return;
  const target = prefix === undefined ? PREFIX : `${PREFIX}${owner()}:${prefix}`;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(target)) localStorage.removeItem(k);
    }
  } catch {}
}

// ── Diffusion des écritures ────────────────────────────────────────────────
//
// `storage` ne se déclenche QUE dans les autres onglets. Pour que les
// composants du même onglet réagissent aussi, on double l'événement natif
// d'un bus local.
type Listener = (key: string) => void;
const listeners = new Set<Listener>();

function notifyLocal(key: string): void {
  listeners.forEach((fn) => {
    try {
      fn(key);
    } catch {}
  });
}

/** S'abonne aux changements d'une clé, dans cet onglet comme dans les autres. */
export function onCacheChange(key: string, fn: () => void): () => void {
  const local: Listener = (k) => {
    if (k === key) fn();
  };
  listeners.add(local);
  const onStorage = (e: StorageEvent) => {
    if (e.key === fullKey(key)) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(local);
    window.removeEventListener("storage", onStorage);
  };
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
  /** Revalider au retour sur l'onglet et au retour du réseau (défaut : oui). */
  revalidateOnFocus?: boolean;
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
  const revalidateOnFocus = opts?.revalidateOnFocus ?? true;
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

  // Un autre onglet a écrit cette clé : on adopte sa valeur sans requête.
  useEffect(() => {
    if (!enabled) return;
    return onCacheChange(key, () => {
      const e = cacheRead<T>(key);
      if (e) setState((s) => (s.key === key ? { ...s, data: e.v, loading: false } : s));
    });
  }, [key, enabled]);

  // Retour sur l'onglet / retour du réseau : les données se rafraîchissent.
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
    data: state.data,
    fromCache: state.fromCache,
    loading: state.loading && enabled,
    error: state.error,
    refresh: revalidate,
  };
}
