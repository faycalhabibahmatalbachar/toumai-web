"use client";

/**
 * LE LECTEUR DE DÉMONSTRATION.
 *
 * Il déroule un scénario étape par étape dans une fenêtre Toumaï. Rien d'autre :
 * pas de réseau, pas d'authentification, pas d'état de conversation.
 *
 * TROIS RÈGLES QUI VIENNENT DE L'AUDIT
 * -------------------------------------
 * 1. TOUT EST LÀ SANS L'ANIMATION. Le scénario complet est rendu d'emblée pour
 *    qui a demandé moins de mouvement, et pour qui arrive avant la fin. Une
 *    démonstration dont le contenu n'existe que pendant l'animation est une
 *    démonstration qu'on ne peut ni lire à son rythme, ni copier, ni indexer.
 * 2. ELLE NE TOURNE QUE VISIBLE. Un `IntersectionObserver` la met en pause dès
 *    qu'elle sort de l'écran : rien ne s'anime dans le vide pendant qu'on lit
 *    les tarifs douze mille pixels plus bas.
 * 3. ELLE S'ARRÊTE. Une boucle infinie sur une page d'accueil finit par attirer
 *    l'œil à contretemps. Le scénario se joue une fois et reste sur sa dernière
 *    image, qui est justement celle qu'on veut laisser.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  BulleUtilisateur,
  CarteConfirmation,
  FenetreProduit,
  LigneActivite,
  PointsDAttente,
  PuceFichier,
  RangeeSources,
  ReponseToumai,
  SignatureToumai,
} from "./primitives";
import type { Etape, Scenario } from "./scenarios";

/* ── La préférence de mouvement, lue hors de React ───────────────────────
 *
 * `useSyncExternalStore` plutôt qu'un effet : poser l'état depuis le corps
 * d'un effet provoque un second rendu à chaque montage, et la règle
 * `react-hooks/set-state-in-effect` le signale à raison. Le projet emploie
 * déjà ce mécanisme dans `CookieConsent`.
 *
 * L'instantané serveur vaut `true` — mouvement réduit. C'est le bon défaut :
 * le rendu envoyé contient alors le scénario ENTIER, donc lisible sans une
 * ligne de JavaScript, et indexable. */
function souscrireMouvement(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function lireMouvement() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function mouvementServeur() {
  return true;
}

/** Combien d'étapes sont visibles.
 *
 * Sans animation — préférence système, onglet caché, rendu serveur — la
 * réponse est « toutes ». Une démonstration dont le contenu n'existe que
 * pendant l'animation ne peut être ni lue à son rythme, ni copiée, ni
 * indexée. */
function useDeroule(scenario: Scenario, actif: boolean) {
  const [visibles, setVisibles] = useState(0);
  const [dansLEcran, setDansLEcran] = useState(false);
  const boite = useRef<HTMLDivElement | null>(null);

  const mouvementReduit = useSyncExternalStore(
    souscrireMouvement,
    lireMouvement,
    mouvementServeur,
  );
  const anime = !mouvementReduit && actif;

  // ELLE NE TOURNE QUE VISIBLE. Rien ne s'anime dans le vide pendant qu'on lit
  // les tarifs douze mille pixels plus bas.
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setDansLEcran(e.isIntersecting),
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const total = scenario.etapes.length;

  // ELLE S'ARRÊTE. Une boucle infinie sur une page d'accueil attire l'oeil à
  // contretemps ; le scénario se joue une fois et reste sur sa dernière image,
  // qui est justement celle qu'on veut laisser.
  useEffect(() => {
    if (!anime || !dansLEcran || visibles >= total - 1) return;
    const t = setTimeout(
      () => setVisibles((v) => v + 1),
      scenario.etapes[visibles].duree,
    );
    return () => clearTimeout(t);
  }, [visibles, dansLEcran, anime, total, scenario]);

  return { boite, nombre: anime ? Math.min(visibles + 1, total) : total };
}

export function DemoToumai({
  scenario,
  actif = true,
  compacte = false,
}: {
  scenario: Scenario;
  /** Faux pour un onglet caché : il ne se joue pas en arrière-plan. */
  actif?: boolean;
  /** Version hero : un peu plus resserrée. */
  compacte?: boolean;
}) {
  const { boite, nombre } = useDeroule(scenario, actif);
  const etapes = scenario.etapes.slice(0, nombre);

  // La confirmation puis son résultat sont deux étapes du scénario mais une
  // seule carte à l'écran : la seconde remplace la première.
  const confirme = etapes.some((e) => e.type === "confirme");

  return (
    <div ref={boite}>
      <FenetreProduit label={`Démonstration : ${scenario.titre}`}>
        <div className={compacte ? "space-y-3" : "space-y-3.5"}>
          {etapes.map((etape, i) => (
            <RenduEtape key={i} etape={etape} confirme={confirme} />
          ))}
        </div>
      </FenetreProduit>
    </div>
  );
}

function RenduEtape({ etape, confirme }: { etape: Etape; confirme: boolean }) {
  switch (etape.type) {
    case "demande":
      return (
        <div className="demo-entree">
          <BulleUtilisateur>
            {etape.texte}
            {etape.fichier && (
              <PuceFichier nom={etape.fichier.nom} poids={etape.fichier.poids} />
            )}
          </BulleUtilisateur>
        </div>
      );

    case "activite":
      return (
        <div className="demo-entree">
          <SignatureToumai />
          <LigneActivite libelle={etape.libelle} />
          <PointsDAttente />
        </div>
      );

    case "attente":
      return (
        <div className="demo-entree">
          <PointsDAttente />
        </div>
      );

    case "sources":
      return (
        <div className="demo-entree">
          <RangeeSources sources={etape.sources} />
        </div>
      );

    case "reponse":
      return (
        <div className="demo-entree">
          <SignatureToumai />
          <ReponseToumai>
            {etape.lignes.length === 1 ? (
              <p>{etape.lignes[0]}</p>
            ) : (
              <ul className="space-y-1.5">
                {etape.lignes.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]"
                    />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReponseToumai>
        </div>
      );

    case "confirmation":
      // Quand l'étape suivante est arrivée, c'est elle qui rend la carte.
      return confirme ? null : (
        <div className="demo-entree">
          <CarteConfirmation action={etape.action} />
        </div>
      );

    case "confirme":
      return (
        <div className="demo-entree">
          <CarteConfirmation action={etape.action} confirme />
        </div>
      );

    case "suite":
      return (
        <div className="demo-entree">
          <span className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            {etape.texte}
          </span>
        </div>
      );
  }
}
