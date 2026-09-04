/**
 * LE PRÉCHARGEMENT DES CONVERSATIONS.
 *
 * LE DÉFAUT
 * ----------
 * Un cache existait déjà : `openSession` sert la conversation depuis
 * `localStorage` avant d'aller la revalider. Il ne couvre qu'un cas, celui du
 * RETOUR sur une conversation déjà ouverte au moins une fois. La toute
 * première ouverture, elle, attend l'aller-retour complet jusqu'à
 * `api.toumaiai.com` : sur une connexion tchadienne, c'est une à trois
 * secondes de squelette à chaque conversation qu'on découvre. Et comme c'est
 * la première fois, c'est précisément le moment où l'on juge le produit.
 *
 * CE QUE FAIT CE MODULE
 * ----------------------
 * Il remplit le cache AVANT qu'on clique. Deux moments, du plus prudent au
 * plus large :
 *
 *   1. Au survol d'une ligne. Le geste dit l'intention 200 à 400 ms avant le
 *      clic, ce qui suffit largement.
 *   2. À l'ouverture de l'application, les quelques conversations les plus
 *      récentes, en tâche de fond.
 *
 * CE QU'IL REFUSE DE FAIRE
 * -------------------------
 * Précharger coûte des octets à quelqu'un qui n'a rien demandé. On s'abstient
 * donc quand le navigateur dit que la connexion est lente ou que l'économiseur
 * de données est actif. Un préchargement qui ralentit la page qu'on est en
 * train de lire est un défaut, pas une optimisation.
 *
 * Il ne précharge jamais deux fois la même conversation, ni une conversation
 * déjà en cache : le but est de supprimer une attente, pas d'ajouter du
 * trafic.
 */

import { getHistory, type HistoryMessage } from "@/lib/chat-api";
import { cacheRead, cacheWrite } from "@/lib/swr-cache";

/** La même clé que celle lue par `openSession`. Une seule vérité. */
export const cleHistorique = (id: string) => `chat:history:${id}`;

/** Le même découpage que celui écrit par `openSession` : 60 messages suffisent
 *  à un retour instantané sans saturer le quota de `localStorage`. */
const MESSAGES_GARDES = 60;

/** Combien de conversations récentes on tire au démarrage. Au-delà, on paie
 *  des requêtes pour des fils que la plupart des gens n'ouvriront pas. */
const RECENTES_MAX = 4;

/** Une conversation à la fois, espacées : le préchargement ne doit jamais
 *  disputer la bande passante à ce que la personne est en train de lire. */
const REPOS_ENTRE_DEUX_MS = 900;

const enCours = new Set<string>();

/**
 * La forme des messages en mémoire.
 *
 * Elle est déclarée ici, et `openSession` s'en sert : deux conversions
 * différentes du même historique finiraient par diverger d'un champ, et le
 * symptôme serait un panneau « Réflexion » qui disparaît quand la conversation
 * vient du cache.
 */
export type MessageEnCache = {
  id: string;
  serverId: string;
  role: string;
  content: string;
  envoyeLe?: string;
  imageUrls?: unknown;
  sources?: unknown;
  searchImages?: unknown;
  reasoning?: unknown;
  reasoningMs?: unknown;
};

export function convertirHistorique(historique: HistoryMessage[]): MessageEnCache[] {
  return historique.map((m) => ({
    id: m.id,
    serverId: m.id,
    role: m.role,
    content: m.content,
    envoyeLe: m.created_at,
    imageUrls: m.metadata?.image_urls,
    sources: m.metadata?.sources,
    searchImages: m.metadata?.search_images,
    reasoning: m.metadata?.reasoning,
    reasoningMs: m.metadata?.reasoning_ms,
  }));
}

/** Le navigateur dit-il que ce n'est pas le moment ? */
function connexionMenagee(): boolean {
  if (typeof navigator === "undefined") return true;
  const c = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

export function dejaEnCache(id: string): boolean {
  return Boolean(cacheRead<MessageEnCache[]>(cleHistorique(id)));
}

/** Tire une conversation et la range. Ne lève jamais : un préchargement qui
 *  échoue doit être invisible, la personne n'a rien demandé. */
export async function prechargerConversation(id: string): Promise<void> {
  if (!id || enCours.has(id) || dejaEnCache(id) || connexionMenagee()) return;
  enCours.add(id);
  try {
    const historique = await getHistory(id);
    cacheWrite(
      cleHistorique(id),
      convertirHistorique(historique).slice(-MESSAGES_GARDES),
    );
  } catch {
    // Réseau, session expirée, conversation supprimée : on ne dit rien.
  } finally {
    enCours.delete(id);
  }
}

/** Les quelques plus récentes, en tâche de fond, une par une. */
export function prechargerLesRecentes(ids: string[]): void {
  if (connexionMenagee()) return;
  const aFaire = ids.filter((id) => !dejaEnCache(id)).slice(0, RECENTES_MAX);
  if (!aFaire.length) return;

  const lancer = async () => {
    for (const id of aFaire) {
      await prechargerConversation(id);
      await new Promise((r) => setTimeout(r, REPOS_ENTRE_DEUX_MS));
    }
  };

  // `requestIdleCallback` attend que le navigateur n'ait plus rien d'urgent.
  // Sans lui, ces requêtes partent pendant que la première page se peint
  // encore, et le préchargement ralentit exactement ce qu'il devait accélérer.
  const idle = (window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (idle) idle(() => void lancer(), { timeout: 4000 });
  else setTimeout(() => void lancer(), 1500);
}
