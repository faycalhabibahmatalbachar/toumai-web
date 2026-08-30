"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getConsentChoice, setConsentChoice } from "@/lib/analytics";
import { LANG_META, type Lang } from "@/lib/i18n/fr";

/**
 * Bandeau de consentement — n'apparaît que si aucun choix n'a encore été fait.
 * Accepter/Refuser ne change rien de visible si aucun outil de mesure n'est
 * configuré (cf. lib/analytics.ts) : le bandeau reste honnête même dans ce
 * cas, car le choix est stocké pour le jour où on en activera un.
 *
 * POURQUOI IL LIT LA LANGUE LUI-MÊME
 * -----------------------------------
 * Il est monté dans le gabarit racine, donc AU-DESSUS du fournisseur de langue
 * de la vitrine — il ne peut pas utiliser `useLang()`. Or c'est la première
 * chose que voit un visiteur arabophone sur la page d'accueil : le laisser en
 * français annulerait l'effet de tout le reste. Il relit donc la même clé de
 * stockage, avec le même repli, et porte ses quatre traductions ici.
 */

const STORAGE_KEY = "toumai_lang";

const COPY: Record<Lang, { body: string; link: string; accept: string; decline: string; aria: string }> = {
  fr: {
    body: "Nous utilisons uniquement des mesures d'audience respectueuses de la vie privée (aucune revente de données, aucun ciblage publicitaire). Voir notre",
    link: "politique de confidentialité",
    accept: "Accepter",
    decline: "Refuser",
    aria: "Consentement aux cookies",
  },
  "ar-td": {
    body: "بنستعملو بس قياس زيارات بيحترم الخصوصية (ما في بيع بيانات، وما في إعلانات موجّهة). شوف",
    link: "سياسة الخصوصية",
    accept: "موافق",
    decline: "لا",
    aria: "الموافقة على ملفّات تعريف الارتباط",
  },
  ar: {
    body: "نستخدم قياسات زيارات تحترم الخصوصية فقط (لا بيع للبيانات، ولا استهداف إعلاني). اطّلع على",
    link: "سياسة الخصوصية",
    accept: "موافق",
    decline: "رفض",
    aria: "الموافقة على ملفّات تعريف الارتباط",
  },
  en: {
    body: "We only use privacy-respecting audience measurement (no data resale, no ad targeting). See our",
    link: "privacy policy",
    accept: "Accept",
    decline: "Decline",
    aria: "Cookie consent",
  },
};

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v in COPY) return v as Lang;
  } catch {
    /* stockage refusé : on reste en français */
  }
  const prefs = navigator.languages ?? [navigator.language];
  for (const raw of prefs) {
    const tag = raw.toLowerCase();
    if (tag.startsWith("ar-td")) return "ar-td";
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
    if (tag.startsWith("fr")) return "fr";
  }
  return "fr";
}

/* ── Un état lu HORS de React ────────────────────────────────────────────────
 *
 * Le choix de consentement et la langue vivent tous deux dans le stockage du
 * navigateur. Les lire dans un effet pour les reposer avec `setState`, c'est
 * deux rendus enchaînés à chaque montage. `useSyncExternalStore` est fait pour
 * ça : instantané serveur = bandeau masqué (le HTML exporté ne doit jamais le
 * contenir), instantané navigateur = l'état réel.
 */
interface Snap {
  visible: boolean;
  lang: Lang;
}

const HIDDEN: Snap = { visible: false, lang: "fr" };
let snap: Snap | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Snap {
  // Mis en cache : `getSnapshot` doit renvoyer la MÊME référence tant que rien
  // n'a changé, sinon React boucle.
  if (snap === null) snap = { visible: getConsentChoice() === null, lang: readLang() };
  return snap;
}

function getServerSnapshot(): Snap {
  return HIDDEN;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function dismiss() {
  snap = { ...getSnapshot(), visible: false };
  listeners.forEach((f) => f());
}

export function CookieConsent() {
  const { visible, lang } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!visible) return null;

  function choose(choice: "accepted" | "declined") {
    setConsentChoice(choice);
    dismiss();
  }

  const c = COPY[lang];
  const meta = LANG_META[lang];

  return (
    <div
      role="dialog"
      aria-label={c.aria}
      lang={meta.htmlLang}
      dir={meta.dir}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
    >
      <div
        className="mx-auto flex max-w-2xl flex-col items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:gap-4"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
        }}
      >
        <p className="flex-1 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {c.body}{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--text-primary)" }}>
            {c.link}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("declined")}
            className="rounded-full border px-4 py-2 text-[13px] font-medium transition hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            {c.decline}
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
