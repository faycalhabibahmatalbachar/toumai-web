/**
 * Messages d'erreur destinés à l'utilisateur.
 *
 * Règle : on ne montre JAMAIS le texte brut d'une exception (« Failed to
 * fetch », « Erreur 502 », une trace Python…). Chaque cas connu a sa phrase,
 * qui dit ce qui s'est passé et ce que la personne peut faire. Les cas
 * inconnus tombent sur une phrase honnête, jamais sur un code.
 */

/** Erreur HTTP avec son statut — c'est le statut qui permet de choisir le bon
 * message, pas une comparaison de chaînes fragile. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    /** Message renvoyé par le backend, s'il est présentable. */
    public readonly serverMessage?: string,
    /** LE CORPS DU REFUS, TEL QUEL.
     *
     * Un 429 de quota ne porte pas qu'un statut : il dit quelle limite, quel
     * plan, combien il reste et QUAND ça repart. Sans ce champ, tout cela
     * était jeté par la couche HTTP et l'écran affichait « trop de demandes,
     * patientez quelques secondes », ce qui est faux quand la remise à zéro
     * est dans quatre heures. */
    public readonly detail?: unknown,
  ) {
    super(serverMessage || `HTTP ${status}`);
    this.name = "HttpError";
  }
}

/** Le corps d'un refus de quota, tel que le pose `core/quotas.py`. */
export type RefusQuota = {
  code: "quota_depasse";
  metrique: string;
  libelle: string;
  plan: string;
  plafond: number;
  utilise: number;
  fenetre: string;
  repart_le: string | null;
  repart_dans: number | null;
  repart_en_clair: string;
  message: string;
};

/** Le refus de quota porté par une erreur, ou `null`. */
export function refusDeQuota(err: unknown): RefusQuota | null {
  if (!(err instanceof HttpError) || err.status !== 429) return null;
  const d = err.detail as RefusQuota | undefined;
  return d && d.code === "quota_depasse" ? d : null;
}

export type ErrorContext =
  | "chat"
  | "voice"
  | "upload"
  | "history"
  | "settings"
  | "generic";

export interface FriendlyError {
  /** Phrase affichable telle quelle. Vide = ne rien afficher. */
  message: string;
  /** Une nouvelle tentative a des chances d'aboutir. */
  retryable: boolean;
  /** Cas identifié, pour les appelants qui veulent réagir différemment. */
  kind:
    | "aborted"
    | "offline"
    | "unreachable"
    | "timeout"
    | "unauthorized"
    | "forbidden"
    | "not-found"
    | "too-large"
    | "rate-limited"
  /** Une limite d'usage du plan, pas une limite de débit. Elle ne se
   *  réessaie pas : elle s'attend, ou elle se lève en changeant de plan. */
  | "quota"
    | "server"
    | "unknown";
}

const CONTEXT_FALLBACK: Record<ErrorContext, string> = {
  chat: "La réponse n'a pas pu aboutir. Réessayez dans un instant.",
  voice: "La voix n'a pas pu être traitée. Réessayez.",
  upload: "Le fichier n'a pas pu être importé. Réessayez.",
  history: "Vos conversations n'ont pas pu être chargées.",
  settings: "Les réglages n'ont pas pu être enregistrés.",
  generic: "Quelque chose n'a pas fonctionné. Réessayez.",
};

const CONTEXT_UNREACHABLE: Record<ErrorContext, string> = {
  chat: "Toumaï AI est injoignable pour le moment. Votre message est conservé, réessayez dans un instant.",
  voice: "Toumaï AI est injoignable — la dictée reprendra dès le retour de la connexion.",
  upload: "Le fichier n'a pas pu être envoyé : Toumaï AI est injoignable.",
  history: "Vos conversations n'ont pas pu être chargées : Toumaï AI est injoignable.",
  settings: "Réglages non enregistrés : Toumaï AI est injoignable.",
  generic: "Toumaï AI est injoignable pour le moment.",
};

/** Le backend renvoie parfois une phrase écrite pour l'utilisateur : on la
 * garde. Mais un « Internal Server Error », un nom de classe ou un pavé de
 * trace ne doivent jamais atteindre l'écran. */
function usableServerMessage(raw?: string): string | null {
  const msg = raw?.trim();
  if (!msg) return null;
  if (msg.length > 180) return null;
  if (/\n/.test(msg)) return null;
  if (/^(internal server error|bad gateway|service unavailable|not found|unauthorized|forbidden)$/i.test(msg)) {
    return null;
  }
  // Traces et identifiants techniques : Traceback, module.Classe, {"detail":…}
  if (/traceback|exception|at \w+\.|^[[{]|^\w+Error\b|_[a-z]+\.[a-z]+/i.test(msg)) return null;
  return msg;
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Une requête réseau qui n'a jamais abouti (DNS, CORS, serveur éteint, tunnel
 * coupé) se présente comme un TypeError, avec un libellé différent par
 * navigateur — d'où la liste. */
function isNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /failed to fetch|networkerror|load failed|network request failed|err_internet_disconnected/i.test(
    msg,
  );
}

export function describeError(err: unknown, context: ErrorContext = "generic"): FriendlyError {
  // 1. Annulation volontaire (bouton Arrêter, navigation) — rien à dire.
  if (err instanceof DOMException && err.name === "AbortError") {
    return { message: "", retryable: false, kind: "aborted" };
  }
  if (err instanceof Error && (err.name === "AbortError" || err.name === "CanceledError")) {
    return { message: "", retryable: false, kind: "aborted" };
  }

  // 2. Délai dépassé.
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return {
      message:
        context === "chat"
          ? "Toumaï AI met trop de temps à répondre. Réessayez — la question était peut-être trop lourde."
          : "L'opération a pris trop de temps. Réessayez.",
      retryable: true,
      kind: "timeout",
    };
  }

  // 3. Appareil hors ligne : c'est différent d'un serveur qui ne répond pas,
  //    et l'action à faire n'est pas la même.
  if (isOffline()) {
    return {
      message:
        context === "chat"
          ? "Vous êtes hors ligne. Votre message est conservé et partira dès le retour de la connexion."
          : "Vous êtes hors ligne. Vérifiez votre connexion.",
      retryable: true,
      kind: "offline",
    };
  }

  // 4. Statuts HTTP connus.
  if (err instanceof HttpError) {
    const fromServer = usableServerMessage(err.serverMessage);
    switch (true) {
      case err.status === 401:
        return {
          message: "Votre session a expiré. Reconnectez-vous pour continuer.",
          retryable: false,
          kind: "unauthorized",
        };
      case err.status === 403:
        return {
          message: fromServer ?? "Cette fonctionnalité n'est pas accessible avec votre compte.",
          retryable: false,
          kind: "forbidden",
        };
      case err.status === 404:
        return {
          message:
            context === "history"
              ? "Cette conversation n'existe plus."
              : fromServer ?? "Cet élément n'existe plus.",
          retryable: false,
          kind: "not-found",
        };
      case err.status === 413:
        return {
          message: "Ce fichier est trop lourd. Essayez une version plus légère.",
          retryable: false,
          kind: "too-large",
        };
      case err.status === 429: {
        // UN QUOTA N'EST PAS UNE LIMITE DE DÉBIT. « Patientez quelques
        // secondes » est faux quand la remise à zéro est dans quatre heures,
        // et cette phrase-là fait cliquer trois fois avant d'abandonner sans
        // avoir compris. Quand le serveur dit quelle limite et quand elle
        // repart, on le répète mot pour mot.
        const quota = refusDeQuota(err);
        if (quota) {
          return { message: quota.message, retryable: false, kind: "quota" };
        }
        return {
          message: "Trop de demandes d'un coup. Patientez quelques secondes puis réessayez.",
          retryable: true,
          kind: "rate-limited",
        };
      }
      case err.status === 502 || err.status === 503 || err.status === 504:
        return {
          // Le backend s'endort quand il n'est pas sollicité : le premier appel
          // le réveille et peut échouer. Le dire évite de faire croire à une panne.
          message: "Toumaï AI redémarre. Réessayez dans quelques secondes.",
          retryable: true,
          kind: "server",
        };
      case err.status >= 500:
        return {
          message: "Toumaï AI a rencontré un problème de son côté. Réessayez dans un instant.",
          retryable: true,
          kind: "server",
        };
      case err.status >= 400:
        return {
          message: fromServer ?? CONTEXT_FALLBACK[context],
          retryable: false,
          kind: "unknown",
        };
    }
  }

  // 5. Requête qui n'a jamais atteint le serveur.
  if (isNetworkFailure(err)) {
    return { message: CONTEXT_UNREACHABLE[context], retryable: true, kind: "unreachable" };
  }

  // 6. Inconnu : une phrase du backend si elle est lisible, sinon la phrase
  //    générique du contexte. Jamais le message brut de l'exception.
  const raw = err instanceof Error ? usableServerMessage(err.message) : null;
  return { message: raw ?? CONTEXT_FALLBACK[context], retryable: true, kind: "unknown" };
}

/** Raccourci : la phrase seule. */
export function errorMessage(err: unknown, context: ErrorContext = "generic"): string {
  return describeError(err, context).message;
}

/** Micro : les codes de la Web Speech API et de getUserMedia, cas par cas. */
export function microphoneErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "NotAllowedError":
    case "SecurityError":
      return "Le micro est bloqué. Autorisez-le dans les réglages du navigateur, puis réessayez.";
    case "audio-capture":
    case "NotFoundError":
      return "Aucun micro détecté. Branchez-en un ou vérifiez le périphérique d'entrée.";
    case "NotReadableError":
      return "Le micro est déjà utilisé par une autre application.";
    case "no-speech":
      return "Je n'ai rien entendu. Rapprochez-vous du micro et réessayez.";
    case "aborted":
      return "";
    case "network":
      return "La reconnaissance vocale n'a pas pu joindre son service. La dictée continue autrement.";
    default:
      return "Le micro n'a pas pu démarrer. Réessayez.";
  }
}
