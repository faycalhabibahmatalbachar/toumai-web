/**
 * LES MESSAGES D'ERREUR D'AUTHENTIFICATION, EN FRANÇAIS.
 *
 * Mesuré le 09/09/2026 sur `api.toumaiai.com` : une tentative de connexion
 * avec un mauvais mot de passe affichait « Invalid login credentials » sur un
 * produit entièrement francophone. Le message vient de la couche
 * d'authentification en amont, il traverse le backend tel quel, et la page le
 * montrait tel quel.
 *
 * On ne traduit QUE ce qu'on reconnaît. Un message inconnu passe intact :
 * inventer une formulation générique effacerait l'information utile que le
 * serveur essaie de transmettre.
 */

const TRADUCTIONS: [RegExp, string][] = [
  [
    /invalid login credentials/i,
    "Adresse e-mail ou mot de passe incorrect.",
  ],
  [
    /email not confirmed/i,
    "Votre adresse e-mail n’est pas encore confirmée. Ouvrez le message que nous vous avons envoyé.",
  ],
  [
    /user already registered|already been registered/i,
    "Un compte existe déjà avec cette adresse. Connectez-vous plutôt.",
  ],
  [
    /password should be at least/i,
    "Choisissez un mot de passe d’au moins 8 caractères.",
  ],
  [
    /invalid email/i,
    "Cette adresse e-mail ne semble pas valide.",
  ],
  [
    /rate limit|too many requests/i,
    "Trop de tentatives. Patientez une minute avant de réessayer.",
  ],
  [
    /email rate limit exceeded/i,
    "Trop d’e-mails envoyés à cette adresse. Réessayez dans quelques minutes.",
  ],
  [
    /failed to fetch|network ?error/i,
    "Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.",
  ],
];

/** Traduit un message d'erreur connu, ou le rend inchangé. */
export function messageAuth(erreur: unknown, defaut: string): string {
  const brut = erreur instanceof Error ? erreur.message.trim() : "";
  if (!brut) return defaut;
  for (const [motif, texte] of TRADUCTIONS) {
    if (motif.test(brut)) return texte;
  }
  return brut;
}
