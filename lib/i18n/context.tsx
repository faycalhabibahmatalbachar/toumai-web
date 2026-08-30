"use client";

/**
 * Langue de la vitrine.
 *
 * POURQUOI PAS UNE ROUTE PAR LANGUE
 * ----------------------------------
 * Ce serait le meilleur choix pour le référencement — une URL par langue, des
 * balises `hreflang`, chaque version indexée pour elle-même. Mais `/ar` est
 * DÉJÀ pris par la page de fond arabe, écrite pour se classer sur « ذكاء
 * اصطناعي تشاد » ; générer un accueil arabe à la même adresse l'écraserait.
 * Casser une URL qui commence à remonter dans les résultats pour gagner une
 * autre URL, c'est un échange perdant.
 *
 * Le choix est donc : `/` reste la page canonique (française), et la langue de
 * l'interface se change côté navigateur. Les routes par langue restent
 * possibles plus tard, sans rien réécrire — les dictionnaires sont déjà là.
 *
 * POURQUOI LE PREMIER RENDU EST TOUJOURS EN FRANÇAIS
 * ---------------------------------------------------
 * Le site est exporté en statique : le HTML est figé à la construction. Si le
 * premier rendu client choisissait l'arabe, React trouverait un texte
 * différent de celui du serveur — c'est une erreur d'hydratation, et React
 * jette alors tout l'arbre pour le refaire. On rend donc le français d'abord,
 * exactement comme le serveur, puis on bascule dans un effet. Un seul rendu de
 * plus, aucune erreur.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LANGS, LANG_META, fr, type Dict, type Lang } from "./fr";
import { arTd } from "./ar-td";
import { ar } from "./ar";
import { en } from "./en";

const DICTS: Record<Lang, Dict> = { fr, "ar-td": arTd, ar, en };

const STORAGE_KEY = "toumai_lang";

interface LangState {
  lang: Lang;
  dir: "ltr" | "rtl";
  /** `true` tant que la langue enregistrée n'a pas été lue. */
  ready: boolean;
  setLang: (l: Lang) => void;
  t: Dict;
}

const Ctx = createContext<LangState | null>(null);

function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Langue enregistrée, sinon celle du navigateur, sinon le français. */
function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* mode privé, stockage refusé : on continue sans */
  }
  const prefs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const raw of prefs) {
    const tag = raw.toLowerCase();
    // `ar-td` d'abord : c'est le plus précis, et `ar` l'avalerait.
    if (tag === "ar-td" || tag.startsWith("ar-td")) return "ar-td";
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("fr")) return "fr";
    if (tag.startsWith("en")) return "en";
  }
  return "fr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = detect();
    if (next !== "fr") setLangState(next);
    setReady(true);
  }, []);

  // `lang` et `dir` sur <html> : ce sont eux qui font basculer la mise en page
  // en droite-à-gauche, et qui disent au lecteur d'écran quelle voix prendre.
  useEffect(() => {
    const meta = LANG_META[lang];
    const root = document.documentElement;
    root.lang = meta.htmlLang;
    root.dir = meta.dir;
    // ON REMET LA PAGE D'APLOMB EN PARTANT.
    //
    // `dir` vit sur <html>, donc au-dessus de la vitrine. Sans ce nettoyage,
    // quelqu'un qui lit l'accueil en arabe puis ouvre /chat trouverait toute
    // l'application retournée de droite à gauche — alors que le chat, lui,
    // n'est pas traduit. La vitrine ne décide que pour elle-même.
    return () => {
      root.lang = "fr";
      root.dir = "ltr";
    };
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* rien à faire : le choix vaudra pour cette visite seulement */
    }
  }, []);

  const value = useMemo<LangState>(
    () => ({ lang, dir: LANG_META[lang].dir, ready, setLang, t: DICTS[lang] }),
    [lang, ready, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangState {
  const v = useContext(Ctx);
  if (!v) {
    // Un composant de la vitrine rendu hors du fournisseur ne doit pas faire
    // tomber la page : il reçoit le français.
    return { lang: "fr", dir: "ltr", ready: true, setLang: () => {}, t: fr };
  }
  return v;
}

export { LANGS, LANG_META };
export type { Lang, Dict };
