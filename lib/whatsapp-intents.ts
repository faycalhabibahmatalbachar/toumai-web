export type WhatsAppChatIntent =
  | "status"
  | "connect"
  | "reconnect"
  | "qr"
  | "pairing_code"
  | "refresh_pairing"
  | "number"
  | "profile"
  | "last_activity"
  | "connected_duration"
  | "contact_count"
  | "capabilities"
  | "disconnect";

export type WhatsAppIntentResult = {
  intent: WhatsAppChatIntent;
  confidence: "explicit" | "contextual";
};

const WA = /(?:whats?app|واتساب)/i;

/**
 * Ce classifieur ne reconnaît QUE le cycle de vie du connecteur (connexion,
 * QR, état, numéro du compte lié…). Les vraies actions WhatsApp continuent
 * vers le modèle et ses tools : contacts, messages, groupes, statuts, profil,
 * recherche, synchronisation, etc.
 */
const BUSINESS_ACTION = /(?:conversations?|chats?|messages?|contacts?|groupes?|groups?|channels?|cha[iî]nes?|synchronis|sync|chercher|rechercher|trouver|liste|lister|cr[eé]er|ajouter|retirer|supprimer|modifier|changer|mettre|publier|poster|envoyer|r[eé]pondre|r[eé]agir|transf[eé]rer|forward|archiver|d[eé]sarchiver|bloquer|d[eé]bloquer|photo|image|vid[eé]o|document|fichier|appel|call|lire|lecture|r[eé]sumer|analyse|analyser)/i;

const CONNECT = /\b(?:connecte|connecter|connect[eé]|reconnecte|reconnecter|reconnect[eé]|lier|relier|li[eé])\b/i;
const DISCONNECT = /\b(?:d[eé]connecte|d[eé]connecter|deconnecte|deconnecter|logout|d[eé]lier|delier|فصل)\b/i;
const QR = /(?:\bqr\b|code\s+qr|scanner\s+(?:le\s+)?qr|scan(?:ner)?\s+(?:le\s+)?qr|رمز\s*qr)/i;
const PAIRING = /(?:code\s+(?:de\s+)?jumelage|pairing\s*code|code\s+de\s+liaison|رمز\s+الربط)/i;
const REFRESH = /(?:rafra[iî]ch|renouvel|reg[eé]n[eè]r|expire|nouveau\s+qr|nouveau\s+code|refresh|جدد|تحديث)/i;
const NUMBER = /(?:(?:quel(?:\s+est)?|c['’]?est\s+quoi|donne(?:-moi)?|affiche)\s+(?:mon\s+)?num[eé]ro|mon\s+num[eé]ro(?:\s+whats?app)?\s*(?:c['’]?est\s+quoi)?\s*\??$|my\s+(?:whats?app\s+)?number\s*\??$|num[eé]ro\s+(?:du\s+)?compte\s+(?:li[eé]|whats?app))/i;
const PROFILE_INFO = /(?:quel\s+(?:est\s+)?(?:mon\s+)?profil|profil\s+(?:du\s+)?compte\s+li[eé]|profile\s+(?:of\s+)?(?:the\s+)?linked\s+account|nom\s+du\s+compte\s+li[eé])/i;
const LAST_ACTIVITY = /(?:derni[eè]re\s+activit[eé]|last\s+activity|آخر\s+نشاط)/i;
const DURATION = /(?:connect[eé]\s+depuis|depuis\s+combien|depuis\s+quand\s+(?:est[- ]?il\s+)?connect[eé]|connected\s+for|مدة\s+الاتصال)/i;
const CAPABILITIES = /(?:que\s+peux[- ]?tu\s+faire\s+avec\s+(?:mon\s+)?whats?app|capacités?\s+(?:du\s+)?connecteur|capabilities\s+(?:of\s+)?(?:the\s+)?connector|permissions?\s+(?:du\s+)?connecteur|الصلاحيات)/i;
const STATUS = /(?:(?:statut|[ée]tat|status)\s+(?:de\s+)?(?:la\s+)?(?:connexion|liaison|connecteur)|(?:connexion|liaison|connecteur)\s+(?:whats?app\s+)?(?:est[- ]?elle\s+)?(?:active|ouverte|connect[eé]e?)|(?:mon\s+)?whats?app\s+(?:est[- ]?il\s+|est\s+)?connect[eé]\s*\??|(?:is\s+)?(?:my\s+)?whats?app\s+connected\s*\??|v[eé]rifie\s+(?:si\s+)?(?:mon\s+)?whats?app\s+(?:est\s+)?connect[eé])/i;

function isBusinessAction(value: string): boolean {
  // Les verbes du cycle de vie gardent la priorité. « Déconnecte WhatsApp »
  // est une action, mais c'est précisément une action de connexion.
  if (DISCONNECT.test(value) || QR.test(value) || PAIRING.test(value)) return false;
  if (/\breconnect(?:e|er|é)?\b/i.test(value)) return false;
  if (CONNECT.test(value) && !/(?:contacts?|messages?|groupes?|status\b|statut\b|profil|photo)/i.test(value)) {
    return false;
  }
  return BUSINESS_ACTION.test(value);
}

export function classifyWhatsAppIntent(text: string, hasWhatsAppContext = false): WhatsAppIntentResult | null {
  const value = text.trim();
  if (!value) return null;

  const explicit = WA.test(value);
  const contextual = hasWhatsAppContext && !explicit;
  if (!explicit && !contextual) return null;

  // Toute demande métier reste dans le chemin LLM + tools. Cette garde doit
  // précéder NUMBER/STATUS : « cherche un contact dans mon numéro » contient
  // « mon numéro », et « mets un status » contient « status », sans parler du
  // tout du connecteur.
  if (isBusinessAction(value)) return null;

  const confidence: WhatsAppIntentResult["confidence"] = explicit ? "explicit" : "contextual";

  if (DISCONNECT.test(value)) return { intent: "disconnect", confidence };
  if (REFRESH.test(value) && (QR.test(value) || PAIRING.test(value))) {
    return { intent: "refresh_pairing", confidence };
  }
  if (PAIRING.test(value)) return { intent: "pairing_code", confidence };
  if (QR.test(value)) return { intent: "qr", confidence };
  if (/\breconnect(?:e|er|é)?\b/i.test(value) || /reconnecte[- ]?le/i.test(value)) {
    return { intent: "reconnect", confidence };
  }
  if (CONNECT.test(value) && !STATUS.test(value)) return { intent: "connect", confidence };

  if (NUMBER.test(value)) return { intent: "number", confidence };
  if (PROFILE_INFO.test(value)) return { intent: "profile", confidence };
  if (LAST_ACTIVITY.test(value)) return { intent: "last_activity", confidence };
  if (DURATION.test(value)) return { intent: "connected_duration", confidence };
  if (CAPABILITIES.test(value)) return { intent: "capabilities", confidence };
  if (STATUS.test(value)) return { intent: "status", confidence };

  // IMPORTANT : mentionner « WhatsApp » n'est PAS une question de statut.
  // Une commande inconnue doit aller au modèle, qui choisira un tool réel ou
  // dira qu'il n'existe pas, au lieu d'afficher la carte de connectivité.
  return null;
}

export function isWhatsAppConnectorIntent(text: string, hasWhatsAppContext = false): boolean {
  return classifyWhatsAppIntent(text, hasWhatsAppContext) !== null;
}
