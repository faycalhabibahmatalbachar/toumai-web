"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { PHONE_COUNTRIES, phoneFlag } from "@/lib/phone-countries";
import { useLang, type Lang } from "@/lib/i18n/context";

type Country = {
  iso2: string;
  callingCode: string;
  name: string;
};

const COPY: Record<Lang, { country: string; search: string; number: string; noResult: string }> = {
  fr: { country: "Pays", search: "Rechercher un pays ou un indicatif", number: "Numéro de téléphone", noResult: "Aucun pays trouvé" },
  en: { country: "Country", search: "Search country or calling code", number: "Phone number", noResult: "No country found" },
  ar: { country: "الدولة", search: "ابحث عن دولة أو رمز اتصال", number: "رقم الهاتف", noResult: "لم يتم العثور على دولة" },
  "ar-td": { country: "البلد", search: "فتش البلد أو مفتاح الاتصال", number: "رقم التلفون", noResult: "ما لقينا بلد" },
};

const LOCALE: Record<Lang, string> = { fr: "fr", en: "en", ar: "ar", "ar-td": "ar" };

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function PhoneControl({ nativeInput }: { nativeInput: HTMLInputElement }) {
  const { lang } = useLang();
  const copy = COPY[lang];
  const locale = LOCALE[lang];
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [iso2, setIso2] = useState("TD");
  const [localNumber, setLocalNumber] = useState("");

  const countries = useMemo<Country[]>(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      names = null;
    }
    return PHONE_COUNTRIES.map(([code, callingCode]) => ({
      iso2: code,
      callingCode,
      name: names?.of(code) || code,
    })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const selected = countries.find((country) => country.iso2 === iso2)
    || countries.find((country) => country.iso2 === "TD")
    || countries[0];

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale).replace(/^\+/, "");
    if (!needle) return countries;
    return countries.filter((country) =>
      country.name.toLocaleLowerCase(locale).includes(needle)
      || country.iso2.toLocaleLowerCase().includes(needle)
      || country.callingCode.includes(needle),
    );
  }, [countries, locale, query]);

  function parseInternational(raw: string, preferIso?: string) {
    const allDigits = digits(raw);
    if (!allDigits) return null;
    const preferred = countries.find((country) => country.iso2 === preferIso);
    if (preferred && allDigits.startsWith(preferred.callingCode)) {
      return { country: preferred, local: allDigits.slice(preferred.callingCode.length) };
    }
    const match = [...countries]
      .sort((a, b) => b.callingCode.length - a.callingCode.length)
      .find((country) => allDigits.startsWith(country.callingCode));
    return match ? { country: match, local: allDigits.slice(match.callingCode.length) } : null;
  }

  function commit(country: Country, local: string) {
    const cleanLocal = digits(local).slice(0, Math.max(0, 15 - country.callingCode.length));
    setIso2(country.iso2);
    setLocalNumber(cleanLocal);
    setReactInputValue(nativeInput, `+${country.callingCode}${cleanLocal}`);
  }

  useEffect(() => {
    const initial = nativeInput.value.trim();
    const parsed = initial.startsWith("+") ? parseInternational(initial, "TD") : null;
    if (parsed) {
      setIso2(parsed.country.iso2);
      setLocalNumber(parsed.local);
    } else {
      const td = countries.find((country) => country.iso2 === "TD");
      if (td) commit(td, digits(initial));
    }
    // Native input is replaced whenever the WhatsApp phone step reappears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeInput]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  if (!selected) return null;

  return (
    <div className="auth-phone-control" ref={root} dir="ltr">
      <button
        type="button"
        className="auth-country-trigger"
        aria-label={`${copy.country}: ${selected.name}, +${selected.callingCode}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setQuery("");
        }}
      >
        <span className="auth-country-flag" aria-hidden="true">{phoneFlag(selected.iso2)}</span>
        <strong>+{selected.callingCode}</strong>
        <svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1.5 1.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>

      <input
        className="auth-phone-number"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        aria-label={copy.number}
        placeholder="66 00 00 00"
        value={localNumber}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw.trim().startsWith("+")) {
            const parsed = parseInternational(raw, iso2);
            if (parsed) {
              commit(parsed.country, parsed.local);
              return;
            }
          }
          commit(selected, raw);
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text").trim();
          if (!pasted.startsWith("+")) return;
          const parsed = parseInternational(pasted, iso2);
          if (!parsed) return;
          event.preventDefault();
          commit(parsed.country, parsed.local);
        }}
      />

      {open && (
        <div className="auth-country-popover">
          <div className="auth-country-search-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            <input
              ref={searchRef}
              className="auth-country-search"
              type="search"
              value={query}
              placeholder={copy.search}
              aria-label={copy.search}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="auth-country-list" role="listbox" aria-label={copy.country}>
            {filtered.length ? filtered.map((country) => (
              <button
                key={country.iso2}
                type="button"
                role="option"
                aria-selected={country.iso2 === selected.iso2}
                className={country.iso2 === selected.iso2 ? "actif" : ""}
                onClick={() => {
                  commit(country, localNumber);
                  setOpen(false);
                }}
              >
                <span className="auth-country-flag" aria-hidden="true">{phoneFlag(country.iso2)}</span>
                <span className="auth-country-name">{country.name}</span>
                <span className="auth-country-code">+{country.callingCode}</span>
              </button>
            )) : <p className="auth-country-empty">{copy.noResult}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function WhatsAppPhoneEnhancer() {
  const [nativeInput, setNativeInput] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const panel = document.querySelector<HTMLElement>(".auth-login .auth-panneau");
    if (!panel) return;

    let bound: HTMLInputElement | null = null;
    const bind = () => {
      const next = panel.querySelector<HTMLInputElement>('input[type="tel"]');
      if (next === bound) return;
      if (bound) {
        bound.classList.remove("auth-phone-native");
        bound.removeAttribute("aria-hidden");
        bound.removeAttribute("tabindex");
      }
      bound = next;
      if (bound) {
        bound.classList.add("auth-phone-native");
        bound.setAttribute("aria-hidden", "true");
        bound.tabIndex = -1;
      }
      setNativeInput(bound);
    };

    bind();
    const observer = new MutationObserver(bind);
    observer.observe(panel, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (bound) {
        bound.classList.remove("auth-phone-native");
        bound.removeAttribute("aria-hidden");
        bound.removeAttribute("tabindex");
      }
    };
  }, []);

  if (!nativeInput?.parentElement) return null;
  return createPortal(<PhoneControl nativeInput={nativeInput} />, nativeInput.parentElement);
}
