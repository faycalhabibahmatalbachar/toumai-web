"use client";

import { useEffect, useState } from "react";
import { getLimites, type EtatLimites } from "@/lib/user-api";
import { Panel, Row } from "./Rows";

/**
 * Les deux fenêtres glissantes d'usage.
 *
 * POURQUOI DES FENÊTRES GLISSANTES, ET NON « PAR JOUR »
 * ------------------------------------------------------
 * Un quota par jour civil se contourne sans effort et frappe au hasard :
 * commencer à 23 h donne deux quotas en une heure, et travailler l'après-midi
 * bloque jusqu'au lendemain matin. La fenêtre glissante répond à la seule
 * question honnête — « combien pendant les cinq dernières heures ? » — et se
 * reconstitue au fil de l'eau plutôt que d'un coup à minuit.
 *
 * CE QUE CET ÉCRAN NE FAIT PAS
 * -----------------------------
 * Il n'affiche PAS une jauge quand aucun plafond n'est posé. Une barre de
 * progression sans limite au bout est un décor : elle laisse croire qu'un
 * couperet approche alors que rien ne bloque. Tant qu'aucun chiffre n'est
 * configuré, on montre la consommation et on dit qu'il n'y a pas de plafond —
 * ce qui est exactement vrai.
 */
export function LimitesUsage() {
  const [etat, setEtat] = useState<EtatLimites | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    getLimites()
      .then(setEtat)
      .catch(() => setErreur(true));
  }, []);

  if (erreur) {
    return (
      <Panel title="Limites d'usage">
        <Row
          label="Mesure indisponible"
          description="Impossible de lire votre consommation en ce moment. Rechargez la page dans un instant."
        />
      </Panel>
    );
  }

  if (!etat) {
    return (
      <Panel title="Limites d'usage">
        <Row label="Chargement…" />
      </Panel>
    );
  }

  const sansPlafond = !etat.courte.limite && !etat.longue.limite;

  return (
    <Panel title="Limites d'usage">
      {sansPlafond ? (
        <Row
          label="Aucun plafond"
          description={`Vous n'êtes limité ni sur cinq heures ni sur la semaine. À titre indicatif : ${etat.courte.utilise} opération${etat.courte.utilise > 1 ? "s" : ""} coûteuse${etat.courte.utilise > 1 ? "s" : ""} ces cinq dernières heures, ${etat.longue.utilise} sur les sept derniers jours.`}
        />
      ) : (
        <>
          <Fenetre titre="Limite de 5 heures" f={etat.courte} />
          <Fenetre titre="Limite hebdomadaire" f={etat.longue} />
        </>
      )}
      <Row
        label="Ce qui est compté"
        description="Les images, la voix, la recherche web, l'agent et les documents engendrés. Le texte des conversations n'est pas compté : le compter reviendrait à décourager l'usage normal du produit pour économiser presque rien."
      />
    </Panel>
  );
}

function Fenetre({
  titre,
  f,
}: {
  titre: string;
  f: { utilise: number; limite: number; reouvre_dans_s: number };
}) {
  if (!f.limite) return null;
  const part = Math.min(100, (f.utilise / f.limite) * 100);
  const restant = Math.max(0, 100 - part);
  const serre = restant <= 20;
  return (
    <Row
      label={titre}
      // ON MONTRE CE QUI RESTE, PAS CE QUI EST CONSOMMÉ.
      // « 77 % restant » répond à la question qu'on se pose vraiment —
      // « est-ce que je peux continuer ? ». « 23 % utilisé » oblige à faire
      // la soustraction soi-même.
      description={`${Math.round(restant)} % restant — réinitialisation ${formaterDelai(f.reouvre_dans_s)}`}
      stacked
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--hover)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${restant}%`,
            background: serre ? "var(--error)" : "var(--text-primary)",
          }}
        />
      </div>
    </Row>
  );
}

/** « dans 3 h 19 min » — jamais « dans 11 940 secondes ». */
function formaterDelai(s: number): string {
  if (s <= 60) return "dans moins d'une minute";
  const min = Math.floor(s / 60);
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (h < 24) return r ? `dans ${h} h ${String(r).padStart(2, "0")} min` : `dans ${h} h`;
  const j = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `dans ${j} j ${hr} h` : `dans ${j} j`;
}
