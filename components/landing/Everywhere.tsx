"use client";

/**
 * PARTOUT OÙ VOUS ÊTES — le passage où le défilement raconte.
 *
 * Sur grand écran, l'appareil reste épinglé pendant que les trois surfaces
 * défilent à côté : c'est le même produit qui change de contexte, et le fait
 * que le cadre ne bouge PAS est ce qui le dit. Sur petit écran, l'épinglage
 * n'a plus de sens (il ne resterait plus de place pour lire) : les trois
 * moments redeviennent trois blocs, chacun avec sa propre vignette.
 *
 * L'observateur ne surveille que trois éléments et ne déclenche qu'un
 * changement d'entier : rien ne se recalcule pendant qu'on descend.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icons } from "./primitives";
import { useLang } from "@/lib/i18n/context";

type SurfaceId = "web" | "whatsapp" | "mobile";

const SURFACES: { id: SurfaceId; href?: string }[] = [
  { id: "web", href: "/chat" },
  { id: "whatsapp", href: "#connecteurs" },
  { id: "mobile" },
];

export function Everywhere() {
  const { t } = useLang();
  const [active, setActive] = useState<SurfaceId>("web");
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = panels.current.filter((e): e is HTMLDivElement => Boolean(e));
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = hit?.target.getAttribute("data-surface") as SurfaceId | null;
        if (id) setActive(id);
      },
      // Fenêtre centrée sur le milieu de l'écran : le panneau qui « tient » le
      // regard est celui qui commande l'appareil.
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="tm-section">
      <div className="tm-wrap">
        <header data-reveal className="max-w-2xl">
          <p className="tm-eyebrow">{t.everywhere.eyebrow}</p>
          <h2 className="tm-display tm-h2 mt-4">
            {t.everywhere.titleA} <em className="tm-em">{t.everywhere.titleEm}</em>
          </h2>
        </header>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[1fr_minmax(300px,400px)] lg:gap-16">
          {/* Colonne narrative */}
          <div className="flex flex-col gap-4 lg:gap-0">
            {SURFACES.map((s, i) => (
              <div
                key={s.id}
                ref={(el) => {
                  panels.current[i] = el;
                }}
                data-surface={s.id}
                data-reveal
                className="lg:flex lg:min-h-[64vh] lg:flex-col lg:justify-center"
              >
                <div className="tm-card tm-lit p-6 sm:p-7 lg:border-0 lg:bg-transparent lg:p-0">
                  {/* Sur grand écran, un fil du spectre désigne le passage qui
                   * commande l'appareil épinglé. Aucune atténuation du texte :
                   * un paragraphe à demi éteint n'est plus lisible, et c'est
                   * précisément celui qu'on est en train de lire. */}
                  <div className="tm-surface-panel" data-current={active === s.id}>
                    <span className="tm-eyebrow">{t.everywhere[s.id].kicker}</span>
                    <h3 className="tm-display tm-h3 mt-3 max-w-[18ch]">{t.everywhere[s.id].title}</h3>
                    <p className="tm-lead mt-3 max-w-[46ch] text-[15px]">{t.everywhere[s.id].body}</p>
                    <ul className="mt-5 space-y-2">
                      {t.everywhere[s.id].points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "var(--tm-ink-3)" }}>
                          <span className="mt-[3px] shrink-0" style={{ color: "var(--tm-terra-2)" }} aria-hidden="true">
                            <Icons.check size={14} />
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    {s.href && (
                      <Link href={s.href} className="tm-link mt-5 inline-flex text-[14px]">
                        {t.everywhere[s.id].cta}
                        <span className="tm-arrow" aria-hidden="true">
                          <Icons.arrow size={15} />
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* Petit écran : chaque moment porte sa propre vignette. */}
                  <div className="mt-6 lg:hidden">
                    <Device id={s.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Appareil épinglé — grand écran uniquement */}
          <div className="hidden lg:block">
            <div className="tm-pin">
              <div className="relative">
                <span
                  className="tm-glow tm-breathe"
                  aria-hidden="true"
                  style={{
                    left: "50%",
                    top: "45%",
                    width: 380,
                    height: 380,
                    transform: "translate(-50%,-50%)",
                    background:
                      "radial-gradient(circle, color-mix(in srgb, var(--tm-terra) 30%, transparent), transparent 68%)",
                  }}
                />
                <div key={active} className="tm-stage-in">
                  <Device id={active} />
                </div>
                <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
                  {SURFACES.map((s) => (
                    <span
                      key={s.id}
                      // `transition-all` ferait surveiller au navigateur
                      // chaque propriété de l'élément ; seules deux changent.
                      className="h-1 rounded-full transition-[width,background-color] duration-500"
                      style={{
                        width: s.id === active ? 26 : 8,
                        background: s.id === active ? "var(--tm-terra)" : "var(--tm-line-2)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Les trois appareils ─────────────────────────────────────────────────── */

function Device({ id }: { id: SurfaceId }) {
  if (id === "web") return <WebDevice />;
  if (id === "whatsapp") return <WhatsAppDevice />;
  return <PhoneDevice />;
}

function Frame({
  children,
  phone = false,
  label,
}: {
  children: React.ReactNode;
  phone?: boolean;
  label: string;
}) {
  return (
    <div
      className={`tm-console mx-auto w-full ${phone ? "max-w-[248px] rounded-[34px]" : "max-w-none"}`}
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
}

function WebDevice() {
  return (
    <Frame label="Toumaï AI ouvert dans un navigateur : une question en français, une réponse qui commence en arabe tchadien">
      <div className="tm-console-bar">
        {[0, 1, 2].map((d) => (
          <span key={d} className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--tm-line-2)" }} />
        ))}
        <span
          className="tm-mono ml-1 rounded-md px-2 py-0.5 text-[10px]"
          style={{ background: "var(--tm-surface-2)", color: "var(--tm-ink-4)" }}
        >
          toumaiai.com/chat
        </span>
      </div>
      <div className="flex h-[286px]">
        <div
          className="hidden w-[92px] shrink-0 border-r p-2.5 sm:block"
          style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface)" }}
        >
          <div
            className="mb-2 rounded-md px-2 py-1.5 text-[9.5px]"
            style={{ background: "var(--tm-surface-3)", color: "var(--tm-ink-3)" }}
          >
            + Nouvelle
          </div>
          {[92, 78, 86, 64].map((w, i) => (
            <div
              key={i}
              className="mb-1.5 h-[7px] rounded"
              style={{ width: `${w}%`, background: "var(--tm-line)" }}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          <div className="tm-bubble text-[11.5px]">Traduis ça en arabe tchadien.</div>
          <p dir="rtl" lang="ar" className="tm-display mt-3 text-[1.35rem]" style={{ color: "var(--tm-amber)" }}>
            إنت كيف اليوم؟
          </p>
          <div className="mt-2 space-y-1.5">
            {[96, 88, 72].map((w, i) => (
              <div key={i} className="h-[6px] rounded" style={{ width: `${w}%`, background: "var(--tm-line)" }} />
            ))}
          </div>
          <div
            className="mt-auto flex items-center gap-2 rounded-full border px-3 py-2 text-[10.5px]"
            style={{ borderColor: "var(--tm-line)", color: "var(--tm-ink-4)" }}
          >
            Écrivez à Toumaï AI…
            <span
              className="ml-auto grid h-5 w-5 place-items-center rounded-full text-[10px]"
              style={{ background: "var(--tm-solid)", color: "var(--tm-solid-ink)" }}
            >
              ↑
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function WhatsAppDevice() {
  return (
    <Frame phone label="Un échange avec Toumaï AI dans une conversation WhatsApp, sur téléphone">
      <div
        className="flex items-center gap-2 px-3.5 py-3"
        style={{ borderBottom: "1px solid var(--tm-line)", background: "var(--tm-surface)" }}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
          style={{ background: "var(--tm-accent-soft)", color: "var(--tm-terra-2)" }}
          aria-hidden="true"
        >
          T
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11.5px] font-medium">Toumaï AI</span>
          <span className="block text-[9.5px]" style={{ color: "var(--tm-ink-4)" }}>
            en ligne
          </span>
        </span>
      </div>
      <div className="flex h-[300px] flex-col gap-2 p-3">
        <span className="tm-bubble text-[11px]">Résume-moi le message vocal d&apos;Ahmat.</span>
        <span
          className="w-fit max-w-[86%] rounded-[14px_14px_14px_4px] border px-3 py-2 text-[11px] leading-snug"
          style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface-2)", color: "var(--tm-ink-2)" }}
        >
          Il confirme la livraison de vendredi et demande une facture au nom de
          la coopérative.
        </span>
        <span className="tm-bubble text-[11px]">Réponds-lui d&apos;accord.</span>
        <span
          className="w-fit max-w-[86%] rounded-[14px_14px_14px_4px] border px-3 py-2 text-[11px] leading-snug"
          style={{ borderColor: "var(--tm-accent-line)", background: "var(--tm-accent-soft)", color: "var(--tm-ink-2)" }}
        >
          Message prêt. Je l&apos;envoie ?
        </span>
        <span
          className="mt-auto rounded-full border px-3 py-2 text-[10px]"
          style={{ borderColor: "var(--tm-line)", color: "var(--tm-ink-4)" }}
        >
          Message
        </span>
      </div>
    </Frame>
  );
}

function PhoneDevice() {
  return (
    <Frame phone label="L'application Toumaï AI sur Android : accueil, suggestions et mode vocal">
      <div className="flex h-[352px] flex-col p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold">Toumaï AI</span>
          <span className="tm-chip text-[9px]">Sao 4</span>
        </div>

        <div className="mt-7 text-center">
          <p className="tm-display text-[1.5rem]">Bonsoir.</p>
          <p className="mt-1 text-[10.5px]" style={{ color: "var(--tm-ink-4)" }}>
            Par quoi commence-t-on ?
          </p>
        </div>

        <div className="mt-6 space-y-2">
          {["Traduire en arabe tchadien", "Résumer un document", "Générer une image"].map((s) => (
            <div
              key={s}
              className="rounded-xl border px-3 py-2.5 text-[10.5px]"
              style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface-2)", color: "var(--tm-ink-2)" }}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <span
            className="flex-1 rounded-full border px-3 py-2 text-[10px]"
            style={{ borderColor: "var(--tm-line)", color: "var(--tm-ink-4)" }}
          >
            Message
          </span>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--tm-solid)", color: "var(--tm-solid-ink)" }}
            aria-hidden="true"
          >
            <Icons.mic size={15} />
          </span>
        </div>
      </div>
    </Frame>
  );
}
