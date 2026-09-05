"use client";

/**
 * L'USAGE, SANS QUITTER LA CONVERSATION.
 *
 * POURQUOI UN PANNEAU ET PAS UN LIEN
 * ===================================
 * La page `/usage` existe et dit tout. Mais « combien il me reste ? » se pose
 * au milieu d'un échange, et partir sur une autre page pour le savoir, c'est
 * perdre le fil de ce qu'on était en train d'écrire. La commande `/usage`
 * répond sur place, puis on referme et on continue.
 *
 * CE QU'IL MONTRE, ET DANS QUEL ORDRE
 * ====================================
 * Ce qui bloque d'abord, ce qui ne bloquera jamais ensuite. C'est l'ordre dans
 * lequel la question se pose : on regarde ses compteurs parce qu'on vient
 * d'être arrêté, ou parce qu'on sent qu'on va l'être.
 *
 * LES CHIFFRES VIENNENT DU SERVEUR
 * =================================
 * `/abonnements/moi`, la même source que la page complète et que la barrière
 * qui refuse pour de bon. Rien n'est compté ici : un compteur tenu par le
 * navigateur repart à zéro au rechargement et ignore le deuxième onglet.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";

type Quota = {
  utilise: number;
  plafond: number;
  illimite: boolean;
  restant: number | null;
  fenetre: string;
  secondes_restantes: number | null;
};

type Etat = {
  plan: { code: string; nom: string; prix_xaf?: number };
  quotas: Record<string, Quota>;
};

/** Ce qu'on montre, et sous quel nom.
 *
 * La table des plans compte une quinzaine de métriques. Les afficher toutes
 * ferait un tableau de bord ; on garde celles qui répondent aux questions
 * qu'on se pose vraiment en pleine conversation. Le reste est sur la page. */
const LIGNES: { cle: string; nom: string }[] = [
  { cle: "messages_5h", nom: "Messages sur 5 heures" },
  { cle: "messages", nom: "Messages du jour" },
  { cle: "messages_semaine", nom: "Messages de la semaine" },
  { cle: "images", nom: "Images du mois" },
  { cle: "documents", nom: "Documents du mois" },
  { cle: "connecteur_actions", nom: "Actions de connecteur" },
];

function enClair(secondes: number | null): string {
  if (secondes === null) return "";
  if (secondes < 90) return "moins d’une minute";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures < 24) return reste ? `${heures} h ${String(reste).padStart(2, "0")}` : `${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "1 jour" : `${jours} jours`;
}

export function PanneauUsage({ onClose }: { onClose: () => void }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch(`${API_BASE}/abonnements/moi`, { headers: authHeaders() });
      if (!reponse.ok) {
        // « Je n'ai pas pu lire » et « vous n'avez aucune limite » ne se disent
        // pas pareil. Afficher un panneau vide serait la seconde phrase.
        setErreur("Je n’arrive pas à lire vos compteurs pour l’instant.");
        return;
      }
      const charge = await reponse.json();
      if (charge?.data) setEtat(charge.data as Etat);
      else setErreur("Je n’arrive pas à lire vos compteurs pour l’instant.");
    } catch {
      setErreur("Je n’arrive pas à lire vos compteurs pour l’instant.");
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire]);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onClose]);

  const lignes = etat
    ? LIGNES.map(({ cle, nom }) => ({ cle, nom, q: etat.quotas?.[cle] })).filter(({ q }) => q)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Votre usage"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[18px] sm:rounded-[18px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-baseline gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Votre usage
          </h2>
          {etat ? (
            <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
              Plan {etat.plan.nom}
            </span>
          ) : null}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto text-[13px] underline underline-offset-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {erreur ? (
            <p className="text-[13.5px]" style={{ color: "var(--text-secondary)" }}>
              {erreur}
            </p>
          ) : !etat ? (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-[10px]"
                  style={{ background: "var(--border)" }}
                />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {lignes.map(({ cle, nom, q }) => {
                const quota = q!;
                if (quota.illimite) {
                  return (
                    <li key={cle} className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                        {nom}
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                        illimité
                      </span>
                    </li>
                  );
                }
                // UN PLAFOND À ZÉRO N'EST PAS UN QUOTA ÉPUISÉ : c'est une
                // fonction que le plan n'inclut pas. Les deux se refusent, mais
                // confondre les deux ferait attendre une remise à zéro qui
                // n'arrivera jamais.
                if (quota.plafond <= 0) {
                  return (
                    <li key={cle} className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
                        {nom}
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                        non inclus
                      </span>
                    </li>
                  );
                }
                const epuise = (quota.restant ?? 0) <= 0;
                const part = Math.min(1, quota.utilise / quota.plafond);
                return (
                  <li key={cle} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                        {nom}
                      </span>
                      <span
                        className="tabular-nums text-[13px]"
                        style={{ color: epuise ? "var(--danger, #c0573a)" : "var(--text-tertiary)" }}
                      >
                        {quota.utilise} / {quota.plafond}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="h-1 w-full overflow-hidden rounded-full"
                      style={{ background: "var(--border)" }}
                    >
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(2, part * 100)}%`,
                          background: epuise ? "var(--danger, #c0573a)" : "var(--primary)",
                        }}
                      />
                    </span>
                    {quota.secondes_restantes ? (
                      <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                        {epuise ? "Reprise dans " : "Repart dans "}
                        {enClair(quota.secondes_restantes)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Le pied ne porte plus que la sortie. « Les compteurs viennent du
            serveur » expliquait une garantie technique à quelqu'un qui voulait
            juste savoir ce qu'il lui reste : c'est notre problème, pas le sien. */}
        <div
          className="flex items-center justify-end border-t px-5 py-3 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
        >
          <Link href="/usage" className="underline underline-offset-2">
            Tout voir
          </Link>
        </div>
      </div>
    </div>
  );
}
