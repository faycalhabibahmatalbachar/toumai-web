import { clearSession } from "./api";

let handling = false;

/** Le token a expiré ou est invalide (401) — on efface la session locale et
 * on recharge : au prochain montage, useAuth() ne trouve plus de session et
 * relance une connexion invité automatiquement (voir app/chat/page.tsx). */
export function handleUnauthorized(): void {
  if (handling || typeof window === "undefined") return;
  handling = true;
  clearSession();
  window.location.reload();
}
