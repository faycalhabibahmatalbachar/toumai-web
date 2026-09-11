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
const CONNECT = /(?:connect(?:e|é|er|é|ion|ed)?|reconnect|lier|lié|link|ربط|متصل)/i;
const DISCONNECT = /(?:déconnect|deconnect|logout|délier|delier|فصل)/i;
const QR = /(?:\bqr\b|scanner|scan|رمز\s*qr)/i;
const PAIRING = /(?:code\s+(?:de\s+)?jumelage|pairing\s*code|code\s+plut[oô]t|رمز\s+الربط)/i;
const REFRESH = /(?:rafra[iî]ch|renouvel|expire|nouveau\s+qr|refresh|جدد|تحديث)/i;
const NUMBER = /(?:mon\s+num[eé]ro|my\s+number|phone\s+number|num[eé]ro\s+whats?app|رقم(?:ي)?)/i;
const PROFILE = /(?:profil|profile|nom\s+du\s+compte|اسم\s+الحساب)/i;
const CONTACTS = /(?:combien.*contacts?|nombre.*contacts?|contact\s+count|عدد.*جهات)/i;
const LAST_ACTIVITY = /(?:derni[eè]re\s+activit[eé]|last\s+activity|آخر\s+نشاط)/i;
const DURATION = /(?:connect[eé]\s+depuis|depuis\s+combien|connected\s+for|مدة\s+الاتصال)/i;
const CAPABILITIES = /(?:que\s+peux[- ]?tu\s+faire|capacités?|capabilities|permissions?|fonctionnalit[eé]s|ماذا.*تفعل|الصلاحيات)/i;
const STATUS = /(?:statut|[ée]tat|connect[eé]\s*\?|connected\s*\?|status|متصل\s*\?|الحالة)/i;

export function classifyWhatsAppIntent(text: string, hasWhatsAppContext = false): WhatsAppIntentResult | null {
  const value = text.trim();
  if (!value) return null;
  const explicit = WA.test(value);
  const contextual = hasWhatsAppContext && !explicit;
  if (!explicit && !contextual) return null;

  const confidence: WhatsAppIntentResult["confidence"] = explicit ? "explicit" : "contextual";
  if (DISCONNECT.test(value)) return { intent: "disconnect", confidence };
  if (REFRESH.test(value) && (QR.test(value) || PAIRING.test(value) || contextual)) return { intent: "refresh_pairing", confidence };
  if (PAIRING.test(value)) return { intent: "pairing_code", confidence };
  if (QR.test(value)) return { intent: "qr", confidence };
  if (/reconnect/i.test(value) || /reconnecte[- ]?le/i.test(value)) return { intent: "reconnect", confidence };
  if (CONNECT.test(value) && !STATUS.test(value)) return { intent: "connect", confidence };
  if (NUMBER.test(value)) return { intent: "number", confidence };
  if (PROFILE.test(value)) return { intent: "profile", confidence };
  if (CONTACTS.test(value)) return { intent: "contact_count", confidence };
  if (LAST_ACTIVITY.test(value)) return { intent: "last_activity", confidence };
  if (DURATION.test(value)) return { intent: "connected_duration", confidence };
  if (CAPABILITIES.test(value)) return { intent: "capabilities", confidence };
  if (STATUS.test(value) || explicit) return { intent: "status", confidence };
  return null;
}

export function isWhatsAppConnectorIntent(text: string, hasWhatsAppContext = false): boolean {
  return classifyWhatsAppIntent(text, hasWhatsAppContext) !== null;
}
