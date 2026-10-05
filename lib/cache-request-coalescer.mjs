/**
 * Petit singleflight navigateur pour les lectures server-state.
 *
 * Il ne stocke aucune réponse : il mutualise uniquement une Promise EN COURS.
 * Le cache SWR garde la responsabilité de la fraîcheur/persistance. Deux
 * composants demandant la même clé au même instant partagent donc un seul
 * fetch réseau, puis chaque appelant reçoit la même valeur/erreur.
 */
const inflight = new Map();

/**
 * @template T
 * @param {string} identity clé déjà cloisonnée par compte
 * @param {() => Promise<T>} factory
 * @returns {Promise<T>}
 */
export function coalesceRequest(identity, factory) {
  if (!identity) throw new Error("cache request identity is required");
  const existing = inflight.get(identity);
  if (existing) return existing;

  /** @type {Promise<T>} */
  let request;
  request = Promise.resolve()
    .then(factory)
    .finally(() => {
      // Ne retire jamais une requête plus récente qui aurait réutilisé la clé.
      if (inflight.get(identity) === request) inflight.delete(identity);
    });
  inflight.set(identity, request);
  return request;
}

/** Visible uniquement pour certification/diagnostic, jamais requis par l'UI. */
export function inflightRequestCount() {
  return inflight.size;
}

/** Réinitialisation de test. Une purge applicative n'annule pas le réseau. */
export function resetRequestCoalescerForTests() {
  inflight.clear();
}
