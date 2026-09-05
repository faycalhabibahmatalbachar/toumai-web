"use client";

/**
 * LA SIGNATURE D'OUVERTURE — le T se trace, puis s'efface.
 *
 * POURQUOI UNE ATTENTE PEUT ÊTRE UTILE
 * -------------------------------------
 * Le site est un export statique : la page arrive vite, mais sur une
 * connexion tchadienne il reste une seconde ou deux où l'écran est nu. Ce
 * temps-là existe de toute façon. Autant qu'il dise quelque chose.
 *
 * Le T se dessine au trait, comme la réponse manuscrite de la scène de la
 * boîte mail. C'est la même idée à deux endroits du produit : une machine qui
 * écrit plutôt qu'une machine qui affiche.
 *
 * TROIS RÈGLES, ET AUCUNE N'EST NÉGOCIABLE
 * -----------------------------------------
 * 1. **Une seule fois par session.** Une animation d'ouverture qu'on revoit à
 *    chaque navigation devient une taxe. `sessionStorage` la borne à l'onglet
 *    en cours : elle revient à la prochaine visite, jamais entre deux pages.
 *
 * 2. **Elle ne retarde jamais rien.** Le voile est posé PAR-DESSUS une page
 *    déjà rendue et se retire tout seul. Si le JavaScript échoue, il n'y a
 *    pas de voile du tout, donc rien à débloquer. Un écran de chargement qui
 *    peut rester coincé est pire que pas d'écran de chargement.
 *
 * 3. **Mouvement réduit : rien.** Pas une version courte, rien. Quelqu'un qui
 *    a coupé les animations n'a pas demandé une animation plus rapide.
 */

import { useEffect, useRef, useState } from "react";

/** La durée du tracé, puis celle du retrait. Deux secondes en tout : au-delà,
 *  ce n'est plus une signature, c'est une porte fermée. */
const TRACE_MS = 1150;
const RETRAIT_MS = 520;

const CLE = "toumai:signature-vue";

export function SignatureOuverture() {
  const [monte, setMonte] = useState(false);
  const [sort, setSort] = useState(false);
  const minuteries = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return;

    let dejaVue = false;
    try {
      dejaVue = sessionStorage.getItem(CLE) === "1";
      sessionStorage.setItem(CLE, "1");
    } catch {
      // Navigation privée, stockage bloqué : on joue une fois et on n'insiste
      // pas. Mieux vaut une signature de trop qu'une exception.
    }
    if (dejaVue) return;

    setMonte(true);
    minuteries.current.push(
      window.setTimeout(() => setSort(true), TRACE_MS),
      window.setTimeout(() => setMonte(false), TRACE_MS + RETRAIT_MS),
    );

    return () => {
      minuteries.current.forEach((m) => window.clearTimeout(m));
      minuteries.current = [];
    };
  }, []);

  if (!monte) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        background: "var(--background, #f6f2ec)",
        opacity: sort ? 0 : 1,
        transition: `opacity ${RETRAIT_MS}ms ease`,
        pointerEvents: sort ? "none" : "auto",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 120 120" fill="none">
        <defs>
          {/* Le spectre de la marque, du bleu au terracotta. C'est celui du
              logo, et c'est ce qui fait qu'on reconnaît le T avant même
              qu'il soit fini. */}
          <linearGradient id="sig-spectre" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c4b8a" />
            <stop offset="0.45" stopColor="#d97857" />
            <stop offset="1" stopColor="#bd4a2c" />
          </linearGradient>
        </defs>

        {/* Deux traits, dans l'ordre où une main les ferait : la barre
            horizontale d'abord, la hampe ensuite. Le `stroke-dasharray` vaut
            la longueur de chaque trait ; l'offset part de cette longueur et
            va à zéro, ce qui donne un trait qui pousse au lieu d'apparaître. */}
        <path
          d="M22 30 H98"
          stroke="url(#sig-spectre)"
          strokeWidth="11"
          strokeLinecap="round"
          style={{
            strokeDasharray: 76,
            strokeDashoffset: 76,
            animation: `sig-trace 620ms cubic-bezier(.62,.02,.34,1) forwards`,
          }}
        />
        <path
          d="M60 30 V100"
          stroke="url(#sig-spectre)"
          strokeWidth="11"
          strokeLinecap="round"
          style={{
            strokeDasharray: 70,
            strokeDashoffset: 70,
            animation: `sig-trace 700ms cubic-bezier(.62,.02,.34,1) 380ms forwards`,
          }}
        />
      </svg>

      <style>{`
        @keyframes sig-trace { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
