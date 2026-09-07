import { safeAccountReturn } from "./payment-navigation";
import { clearSession, loadSession } from "./api";

let handling = false;

/** Le token a expiré ou est invalide (401) et le refresh a échoué.
 *
 * IL N'Y A PLUS DE REPLI. La branche « session invité » rechargeait la page,
 * et le chat rouvrait une session anonyme : la personne ne remarquait rien,
 * mais elle repartait sous une autre identité, sans ses conversations.
 * L'essai sans compte ayant été retiré le 07/09/2026, il ne reste qu'une
 * issue honnête — le dire, et proposer de se reconnecter à SON compte.
 *
 * `?expired=1` compte : sans lui, l'écran de connexion ressemble à un premier
 * arrivage, et on se demande pourquoi on y est.
 */
export function handleUnauthorized(): void {
  if (handling || typeof window === "undefined") return;
  handling = true;
  const avaitUneSession = Boolean(loadSession());
  clearSession();
  const next = safeAccountReturn(window.location.pathname + window.location.search);
  const params = [
    avaitUneSession ? "expired=1" : null,
    next ? `next=${encodeURIComponent(next)}` : null,
  ].filter(Boolean);
  window.location.href = `/login${params.length ? `?${params.join("&")}` : ""}`;
}
