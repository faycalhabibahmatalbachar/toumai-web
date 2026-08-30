"use client";

/**
 * Sélecteur de langue.
 *
 * Chaque langue est écrite DANS SA PROPRE ÉCRITURE — « العربية », pas
 * « Arabe ». Quelqu'un qui ne lit pas le français doit pouvoir trouver sa
 * langue dans la liste ; s'il faut d'abord comprendre le français pour en
 * sortir, le sélecteur ne sert à rien.
 *
 * Pas de drapeaux : un drapeau désigne un pays, pas une langue. L'arabe n'est
 * pas le drapeau de l'Arabie saoudite, et l'arabe tchadien n'aurait aucun
 * drapeau à lui.
 */

import { useEffect, useId, useRef, useState } from "react";
import { LANGS, LANG_META, useLang } from "@/lib/i18n/context";

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${t.nav.language} : ${LANG_META[lang].native}`}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] transition-colors"
        style={{ color: "var(--tm-ink-2)" }}
      >
        <GlobeIcon />
        <span className={compact ? "" : "hidden sm:inline"}>{LANG_META[lang].native}</span>
        <svg
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 220ms ease" }}
        >
          <path d="M1 1.2 4.5 4.7 8 1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={id}
          role="listbox"
          aria-label={t.nav.language}
          className="tm-glass absolute z-50 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border py-1 shadow-lg"
          style={{
            borderColor: "var(--tm-line-2)",
            // `inset-inline-end` et non `right` : en droite-à-gauche, le menu
            // doit s'ouvrir de l'autre côté, sinon il sort de l'écran.
            insetInlineEnd: 0,
          }}
        >
          {LANGS.map((l) => {
            const meta = LANG_META[l];
            const on = l === lang;
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  lang={meta.htmlLang}
                  dir={meta.dir}
                  onClick={() => {
                    setLang(l);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-[13.5px] transition-colors"
                  style={{
                    background: on ? "var(--tm-accent-soft)" : "transparent",
                    color: on ? "var(--tm-ink)" : "var(--tm-ink-2)",
                    textAlign: meta.dir === "rtl" ? "right" : "left",
                  }}
                >
                  <span>{meta.native}</span>
                  {on && (
                    <span aria-hidden="true" style={{ color: "var(--tm-terra-2)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="m4.5 12.5 5 5 10-11" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
