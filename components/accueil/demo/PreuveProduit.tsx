"use client";

/**
 * LA SECTION QUI MONTRE LE PRODUIT.
 *
 * CE QU'ELLE REMPLACE
 * -------------------
 * La page expliquait beaucoup et ne montrait rien. Le plus gros bloc — cinq
 * sections numérotées — démontrait le raisonnement par un morpion, un puzzle,
 * un labyrinthe et un puissance 4. Beau, et muet sur ce que Toumaï fait.
 *
 * POURQUOI UNE FENÊTRE ET DES ONGLETS, PAS TROIS CARTES
 * ------------------------------------------------------
 * Trois cartes côte à côte, c'est le réflexe SaaS, et ça donne trois vignettes
 * qu'on survole sans en lire aucune. Une seule fenêtre, assez grande pour être
 * lisible, et trois entrées pour en changer : on regarde une chose à la fois,
 * et chacune a la place de se dérouler.
 *
 * Les onglets sont de vrais boutons, atteignables au clavier, avec les rôles
 * ARIA qui vont avec — un visiteur au clavier doit pouvoir passer de la
 * recherche à WhatsApp.
 */

import { useState } from "react";

import { DemoToumai } from "./DemoToumai";
import { SCENARIOS } from "./scenarios";

export function PreuveProduit() {
  const [actif, setActif] = useState(SCENARIOS[0].cle);
  const courant = SCENARIOS.find((s) => s.cle === actif) ?? SCENARIOS[0];

  return (
    <section id="demonstration" className="preuve shell" aria-labelledby="preuve-titre">
      <div className="preuve-intro">
        <h2 id="preuve-titre">Voici ce que ça donne.</h2>
        <p>
          Trois demandes ordinaires, telles qu’elles se passent dans Toumaï. Ce que
          vous voyez ici est l’interface réelle.
        </p>
      </div>

      <div className="preuve-onglets" role="tablist" aria-label="Choisir une démonstration">
        {SCENARIOS.map((s) => (
          <button
            key={s.cle}
            type="button"
            role="tab"
            id={`onglet-${s.cle}`}
            aria-selected={s.cle === actif}
            aria-controls={`volet-${s.cle}`}
            className={s.cle === actif ? "est-actif" : undefined}
            onClick={() => setActif(s.cle)}
          >
            {s.onglet}
          </button>
        ))}
      </div>

      <div className="preuve-corps">
        <div
          className="preuve-texte"
          role="tabpanel"
          id={`volet-${courant.cle}`}
          aria-labelledby={`onglet-${courant.cle}`}
        >
          <h3>{courant.titre}</h3>
          <p>{courant.resume}</p>
        </div>

        <div className="preuve-fenetre">
          {/* Chaque scénario garde son composant monté pour ne pas perdre sa
              position au retour, mais seul l'onglet actif se joue. */}
          {SCENARIOS.map((s) => (
            <div key={s.cle} hidden={s.cle !== actif}>
              <DemoToumai scenario={s} actif={s.cle === actif} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
