"use client";

/**
 * Microcopie des widgets du chat.
 *
 * Le chat n'est pas monté sous le `LangProvider` de la vitrine : on relit donc
 * la même préférence (`toumai_lang`) directement. Premier rendu TOUJOURS en
 * français, comme le HTML statique ; la langue choisie arrive après montage,
 * ce qui évite toute erreur d'hydratation.
 *
 * Seul le chrome des widgets est traduit ici (statuts, boutons, libellés). Les
 * contenus produits par le serveur ou un connecteur restent tels quels.
 */

import { useSyncExternalStore } from "react";
import type { StatusKey } from "./core";

export type WidgetLang = "fr" | "en" | "ar";

const fr = {
  status: {
    idle: "Prêt", loading: "Chargement…", pending: "En attente", queued: "En file", running: "En cours",
    verifying: "Vérification…", scheduled: "Programmée", active: "Active", awaiting_confirmation: "À confirmer",
    needs_action: "Action requise", success: "Terminé", sent: "Envoyé", partial_success: "Partiel", warning: "Attention",
    failed: "Échec", error: "Erreur", expired: "Expiré", cancelled: "Annulé", paused: "En pause", archived: "Archivé",
    draft: "Brouillon", blocked: "Non exécuté", offline: "Hors ligne", permission_denied: "Accès refusé",
    auth_required: "Connexion requise", unavailable: "Indisponible", empty: "Vide", unknown: "État inconnu",
  } satisfies Record<StatusKey, string>,
  common: {
    details: "Détails", hideDetails: "Masquer les détails", more: "Plus d’actions", open: "Ouvrir", view: "Voir",
    retry: "Réessayer", cancel: "Annuler", confirm: "Confirmer", keep: "Garder", close: "Fermer",
    showAll: (n: number) => `Afficher tout (${n})`, showLess: "Réduire", download: "Télécharger",
    copy: "Copier", copied: "Copié", unknownValue: "Non renseigné", notAvailable: "Indisponible",
  },
  automation: {
    created: "Automatisation programmée", updated: "Automatisation mise à jour", title: "Automatisation",
    channel: "Canal", recipient: "Destinataire", content: "Contenu", when: "Quand", next: "Prochaine exécution",
    timezone: "Fuseau", lastRun: "Dernière exécution", pause: "Mettre en pause", resume: "Reprendre",
    runNow: "Exécuter maintenant", reschedule: "Modifier ou reprogrammer", duplicate: "Dupliquer", cancel: "Annuler l’automatisation", history: "Voir l’historique",
    cancelTitle: "Annuler cette automatisation ?", cancelBody: "Elle ne s’exécutera plus. L’historique reste consultable.",
    running: "Exécution en cours…", ranNow: "Exécution lancée", paused: "Automatisation en pause", resumed: "Automatisation réactivée",
    duplicated: "Copie créée", cancelled: "Automatisation annulée", actionFailed: "L’action n’a pas abouti.",
    oneShot: "Une fois", recurring: "Récurrente", manual: "Sur demande", localTime: (c: string) => `heure de ${c}`,
  },
  search: {
    title: "Recherche sur le Web", deep: "Recherche approfondie", sources: (n: number) => `${n} source${n > 1 ? "s" : ""}`,
    visited: "Consultée", found: "Trouvée", running: "Recherche et lecture des sources…", none: "Aucune source exploitable.",
  },
  files: {
    ready: "Prêt", processing: "Analyse en cours…", error: "Fichier inaccessible", open: "Ouvrir le fichier",
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`, rows: (n: number) => `${n} ligne${n > 1 ? "s" : ""}`,
    sheets: (n: number) => `${n} feuille${n > 1 ? "s" : ""}`,
  },
  mail: { inbox: "Boîte de réception", count: (n: number) => `${n} e-mail${n > 1 ? "s" : ""}`, none: "Aucun e-mail.", unread: "Non lu", from: "De", to: "À" },
  calendar: { title: "Agenda", none: "Aucun événement sur la période.", allDay: "Toute la journée", events: (n: number) => `${n} événement${n > 1 ? "s" : ""}` },
  scheduled: { title: "Messages programmés", none: "Aucun message programmé.", single: "Message programmé" },
  connector: {
    authTitle: (p: string) => `Connexion requise · ${p}`, authBody: "Connectez ce compte pour que Toumaï puisse continuer.",
    connect: "Connecter", openSettings: "Ouvrir les connecteurs", capabilities: (p: string) => `Capacités · ${p}`,
    availableNow: (n: number) => `${n} disponible${n > 1 ? "s" : ""} maintenant`,
    available: "Disponible", unsupported: "Non pris en charge", unavailableNow: "Indisponible pour l’instant", undeclared: "Non déclaré",
  },
  quota: { title: "Limite d’utilisation", remaining: (n: string) => `${n} restant`, resets: (d: string) => `Renouvellement ${d}`, notIncluded: "Non inclus dans votre formule.", upgrade: "Voir les formules" },
  weather: { feels: "Ressenti", humidity: "Humidité", wind: "Vent", uv: "UV", rain: "Pluie", sunrise: "Lever", sunset: "Coucher", hourly: "Prochaines heures", daily: "Prochains jours" },
  table: { rows: (n: number) => `${n} ligne${n > 1 ? "s" : ""}`, empty: "Aucune donnée." },
  generic: { fallback: "Résultat structuré" },
  action: {
    sensitive: "Cette action ne pourra pas être annulée.", confirmHint: "Vérifiez avant de confirmer.",
  },
};

export type WidgetDict = typeof fr;

const en: WidgetDict = {
  status: {
    idle: "Ready", loading: "Loading…", pending: "Pending", queued: "Queued", running: "Running",
    verifying: "Verifying…", scheduled: "Scheduled", active: "Active", awaiting_confirmation: "Needs confirmation",
    needs_action: "Action needed", success: "Done", sent: "Sent", partial_success: "Partial", warning: "Warning",
    failed: "Failed", error: "Error", expired: "Expired", cancelled: "Cancelled", paused: "Paused", archived: "Archived",
    draft: "Draft", blocked: "Not run", offline: "Offline", permission_denied: "Access denied",
    auth_required: "Sign-in required", unavailable: "Unavailable", empty: "Empty", unknown: "Unknown state",
  },
  common: {
    details: "Details", hideDetails: "Hide details", more: "More actions", open: "Open", view: "View",
    retry: "Retry", cancel: "Cancel", confirm: "Confirm", keep: "Keep", close: "Close",
    showAll: (n) => `Show all (${n})`, showLess: "Show less", download: "Download",
    copy: "Copy", copied: "Copied", unknownValue: "Not provided", notAvailable: "Unavailable",
  },
  automation: {
    created: "Automation scheduled", updated: "Automation updated", title: "Automation",
    channel: "Channel", recipient: "Recipient", content: "Content", when: "When", next: "Next run",
    timezone: "Time zone", lastRun: "Last run", pause: "Pause", resume: "Resume",
    runNow: "Run now", reschedule: "Edit or reschedule", duplicate: "Duplicate", cancel: "Cancel automation", history: "View history",
    cancelTitle: "Cancel this automation?", cancelBody: "It will no longer run. Its history stays available.",
    running: "Running…", ranNow: "Run started", paused: "Automation paused", resumed: "Automation resumed",
    duplicated: "Copy created", cancelled: "Automation cancelled", actionFailed: "The action did not go through.",
    oneShot: "Once", recurring: "Recurring", manual: "On demand", localTime: (c) => `${c} time`,
  },
  search: {
    title: "Web search", deep: "Deep research", sources: (n) => `${n} source${n > 1 ? "s" : ""}`,
    visited: "Read", found: "Found", running: "Searching and reading sources…", none: "No usable source.",
  },
  files: {
    ready: "Ready", processing: "Analyzing…", error: "File unavailable", open: "Open file",
    pages: (n) => `${n} page${n > 1 ? "s" : ""}`, rows: (n) => `${n} row${n > 1 ? "s" : ""}`,
    sheets: (n) => `${n} sheet${n > 1 ? "s" : ""}`,
  },
  mail: { inbox: "Inbox", count: (n) => `${n} email${n > 1 ? "s" : ""}`, none: "No email.", unread: "Unread", from: "From", to: "To" },
  calendar: { title: "Calendar", none: "No events in this period.", allDay: "All day", events: (n) => `${n} event${n > 1 ? "s" : ""}` },
  scheduled: { title: "Scheduled messages", none: "No scheduled message.", single: "Scheduled message" },
  connector: {
    authTitle: (p) => `Sign-in required · ${p}`, authBody: "Connect this account so Toumaï can continue.",
    connect: "Connect", openSettings: "Open connectors", capabilities: (p) => `Capabilities · ${p}`,
    availableNow: (n) => `${n} available now`,
    available: "Available", unsupported: "Not supported", unavailableNow: "Unavailable right now", undeclared: "Not declared",
  },
  quota: { title: "Usage limit", remaining: (n) => `${n} left`, resets: (d) => `Resets ${d}`, notIncluded: "Not included in your plan.", upgrade: "See plans" },
  weather: { feels: "Feels like", humidity: "Humidity", wind: "Wind", uv: "UV", rain: "Rain", sunrise: "Sunrise", sunset: "Sunset", hourly: "Next hours", daily: "Next days" },
  table: { rows: (n) => `${n} row${n > 1 ? "s" : ""}`, empty: "No data." },
  generic: { fallback: "Structured result" },
  action: { sensitive: "This action cannot be undone.", confirmHint: "Check before confirming." },
};

const ar: WidgetDict = {
  status: {
    idle: "جاهز", loading: "جارٍ التحميل…", pending: "قيد الانتظار", queued: "في الطابور", running: "قيد التنفيذ",
    verifying: "جارٍ التحقق…", scheduled: "مجدولة", active: "نشطة", awaiting_confirmation: "بانتظار التأكيد",
    needs_action: "يتطلب إجراء", success: "تم", sent: "أُرسلت", partial_success: "جزئي", warning: "تنبيه",
    failed: "فشل", error: "خطأ", expired: "منتهية", cancelled: "ملغاة", paused: "متوقفة مؤقتاً", archived: "مؤرشفة",
    draft: "مسودة", blocked: "لم تُنفذ", offline: "غير متصل", permission_denied: "تم رفض الوصول",
    auth_required: "يلزم تسجيل الدخول", unavailable: "غير متاح", empty: "فارغ", unknown: "حالة غير معروفة",
  },
  common: {
    details: "التفاصيل", hideDetails: "إخفاء التفاصيل", more: "إجراءات أخرى", open: "فتح", view: "عرض",
    retry: "إعادة المحاولة", cancel: "إلغاء", confirm: "تأكيد", keep: "إبقاء", close: "إغلاق",
    showAll: (n) => `عرض الكل (${n})`, showLess: "عرض أقل", download: "تنزيل",
    copy: "نسخ", copied: "تم النسخ", unknownValue: "غير محدد", notAvailable: "غير متاح",
  },
  automation: {
    created: "تمت جدولة الأتمتة", updated: "تم تحديث الأتمتة", title: "أتمتة",
    channel: "القناة", recipient: "المستلم", content: "المحتوى", when: "الموعد", next: "التنفيذ القادم",
    timezone: "المنطقة الزمنية", lastRun: "آخر تنفيذ", pause: "إيقاف مؤقت", resume: "استئناف",
    runNow: "تنفيذ الآن", reschedule: "تعديل أو إعادة الجدولة", duplicate: "تكرار", cancel: "إلغاء الأتمتة", history: "عرض السجل",
    cancelTitle: "إلغاء هذه الأتمتة؟", cancelBody: "لن تُنفذ بعد الآن. يبقى سجلها متاحاً.",
    running: "جارٍ التنفيذ…", ranNow: "بدأ التنفيذ", paused: "تم إيقاف الأتمتة مؤقتاً", resumed: "تم استئناف الأتمتة",
    duplicated: "تم إنشاء نسخة", cancelled: "تم إلغاء الأتمتة", actionFailed: "لم يكتمل الإجراء.",
    oneShot: "مرة واحدة", recurring: "متكررة", manual: "عند الطلب", localTime: (c) => `بتوقيت ${c}`,
  },
  search: {
    title: "بحث على الويب", deep: "بحث معمّق", sources: (n) => `${n} مصدر`,
    visited: "تمت قراءته", found: "تم العثور عليه", running: "جارٍ البحث وقراءة المصادر…", none: "لا يوجد مصدر صالح.",
  },
  files: {
    ready: "جاهز", processing: "جارٍ التحليل…", error: "الملف غير متاح", open: "فتح الملف",
    pages: (n) => `${n} صفحة`, rows: (n) => `${n} سطر`, sheets: (n) => `${n} ورقة`,
  },
  mail: { inbox: "البريد الوارد", count: (n) => `${n} رسالة`, none: "لا توجد رسائل.", unread: "غير مقروء", from: "من", to: "إلى" },
  calendar: { title: "التقويم", none: "لا توجد أحداث في هذه الفترة.", allDay: "طوال اليوم", events: (n) => `${n} حدث` },
  scheduled: { title: "الرسائل المجدولة", none: "لا توجد رسائل مجدولة.", single: "رسالة مجدولة" },
  connector: {
    authTitle: (p) => `يلزم الاتصال · ${p}`, authBody: "اربط هذا الحساب ليتمكن Toumaï من المتابعة.",
    connect: "ربط", openSettings: "فتح الموصلات", capabilities: (p) => `القدرات · ${p}`,
    availableNow: (n) => `${n} متاحة الآن`,
    available: "متاحة", unsupported: "غير مدعومة", unavailableNow: "غير متاحة حالياً", undeclared: "غير معلنة",
  },
  quota: { title: "حد الاستخدام", remaining: (n) => `متبقٍ ${n}`, resets: (d) => `يتجدد ${d}`, notIncluded: "غير مشمول في باقتك.", upgrade: "عرض الباقات" },
  weather: { feels: "الإحساس", humidity: "الرطوبة", wind: "الرياح", uv: "الأشعة", rain: "المطر", sunrise: "الشروق", sunset: "الغروب", hourly: "الساعات القادمة", daily: "الأيام القادمة" },
  table: { rows: (n) => `${n} سطر`, empty: "لا توجد بيانات." },
  generic: { fallback: "نتيجة منظمة" },
  action: { sensitive: "لا يمكن التراجع عن هذا الإجراء.", confirmHint: "تحقق قبل التأكيد." },
};

const DICTS: Record<WidgetLang, WidgetDict> = { fr, en, ar };
export const LOCALES: Record<WidgetLang, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-TD" };

const STORAGE_KEY = "toumai_lang";
const listeners = new Set<() => void>();

function readLang(): WidgetLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    if (stored === "en") return "en";
    if (stored === "ar" || stored === "ar-td") return "ar";
  } catch {
    /* stockage indisponible : français */
  }
  return "fr";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Force une langue (laboratoire de widgets) sans toucher à la préférence. */
let override: WidgetLang | null = null;
export function setWidgetLangOverride(lang: WidgetLang | null) {
  override = lang;
  listeners.forEach((listener) => listener());
}

export function useWidgetText() {
  const lang = useSyncExternalStore(subscribe, () => override ?? readLang(), () => "fr" as WidgetLang);
  return { t: DICTS[lang], lang, locale: LOCALES[lang], dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const) };
}

/** Date et heure courtes dans la langue des widgets. */
export function formatDateTime(date: Date | null, locale: string, withWeekday = true): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      ...(withWeekday ? { weekday: "short" as const } : {}),
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatTime(date: Date | null, locale: string): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return "";
  }
}

/** « dans 2 h », « il y a 5 min » — relatif quand c'est proche, absolu sinon. */
export function formatRelative(date: Date | null, locale: string, now = Date.now()): string {
  if (!date) return "";
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  if (abs > 6 * 24 * 3600_000) return formatDateTime(date, locale);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), "minute");
    if (abs < 24 * 3600_000) return rtf.format(Math.round(diff / 3600_000), "hour");
    return rtf.format(Math.round(diff / (24 * 3600_000)), "day");
  } catch {
    return formatDateTime(date, locale);
  }
}
