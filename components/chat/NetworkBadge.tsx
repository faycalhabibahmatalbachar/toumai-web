"use client";

import { libelleQualite, meriteAlerte, type QualiteReseau } from "@/lib/network-quality";
import { ORB } from "./VoiceOrb";

/**
 * Dit ce que vaut la liaison, et seulement quand ça compte.
 *
 * POURQUOI IL EST MUET LA PLUPART DU TEMPS
 * -----------------------------------------
 * Un indicateur permanent devient un meuble : on cesse de le voir, et il ne
 * prévient plus de rien. Celui-ci n'apparaît que si la connexion se dégrade —
 * son apparition EST l'information. Quand tout va bien, l'écran reste ce qu'il
 * doit être : une sphère et une voix.
 *
 * LES BARRES *ET* LE MOT
 * -----------------------
 * Trois barres seules demandent d'être interprétées : elles disent « il y en a
 * deux sur trois », pas ce que ça change. Le mot seul, lui, se comprend mais ne
 * se repère pas du coin de l'œil. Les deux ensemble : la forme attire, le mot
 * tranche — et personne n'a rien à apprendre.
 */
export function NetworkBadge({ qualite }: { qualite: QualiteReseau }) {
  const libelle = libelleQualite(qualite);
  if (!libelle) return null;

  // L'ambre pour ce qui ralentit, un rouge sourd pour ce qui est rompu. Pas de
  // rouge vif : la conversation n'est pas en danger, elle est gênée.
  const rompue = qualite === "rompue";
  const couleur = rompue
    ? "217, 138, 126"
    : meriteAlerte(qualite)
      ? ORB.ambre.join(",")
      : ORB.ivoire.join(",");
  const barresPleines = rompue ? 0 : qualite === "faible" ? 1 : 2;

  return (
    <span
      role="status"
      aria-live="polite"
      className="voice-badge flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: "rgba(0,0,0,0.42)",
        border: `1px solid rgba(${couleur}, 0.32)`,
        color: `rgba(${couleur}, 0.95)`,
      }}
    >
      <Barres pleines={barresPleines} rompue={rompue} />
      <span className="text-[12px] font-medium tracking-[0.01em]">{libelle}</span>
    </span>
  );
}

/** Trois arcs, comme partout ailleurs — c'est la forme que tout le monde
 * reconnaît sans y penser. Les arcs éteints restent dessinés en creux : leur
 * absence pure ferait croire à une icône différente plutôt qu'à un manque. */
function Barres({ pleines, rompue }: { pleines: number; rompue: boolean }) {
  const arcs = [
    { d: "M8 12.5a2 2 0 013.9 0", seuil: 0 },
    { d: "M5.4 9.4a5.8 5.8 0 019.2 0", seuil: 1 },
    { d: "M3 6.4a9.6 9.6 0 0114 0", seuil: 2 },
  ];
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
      {arcs.map((a) => (
        <path
          key={a.d}
          d={a.d}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={a.seuil < pleines ? 1 : 0.22}
        />
      ))}
      {rompue && (
        <path d="M3 3l14 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}
