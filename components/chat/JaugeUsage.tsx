"use client";

/**
 * LE BANDEAU DE QUOTA, SOUS LE CHAMP DE SAISIE.
 *
 * IL NE S'AFFICHE QU'AU MOMENT OÙ IL SERT
 * ========================================
 * La première version se montrait dès qu'il restait moins d'un quart du
 * quota. L'intention était bonne — prévenir avant le mur — mais le résultat
 * ne l'était pas : « 1 message aujourd'hui sur 20 » restait affiché en
 * permanence sous le champ de saisie, et un compteur permanent au-dessus
 * d'un endroit où l'on écrit donne l'impression d'être surveillé pendant
 * qu'on parle.
 *
 * Il n'apparaît donc plus qu'une fois la limite ATTEINTE, c'est-à-dire au
 * seul instant où l'information change quelque chose : celui où l'on ne peut
 * plus envoyer et où l'on a besoin de savoir pourquoi.
 *
 * IL DIT CE QUI BLOQUE, PAS TOUT CE QUI EXISTE
 * =============================================
 * Trois limites encadrent les messages : cinq heures, la journée, la semaine.
 * Les afficher toutes serait un tableau de bord. On montre celle qui bloque —
 * et si plusieurs sont pleines, celle qui repart le plus tôt, parce que c'est
 * la seule dont l'heure de reprise intéresse quelqu'un.
 *
 * LES CHIFFRES VIENNENT DU SERVEUR, TOUJOURS
 * ===========================================
 * Rien n'est compté ici. Un compteur tenu par le navigateur repart à zéro à
 * chaque rechargement, ne voit pas le deuxième onglet, et ment dès qu'on
 * ouvre l'application sur un autre appareil. `/abonnements/moi` est la seule
 * source, et elle est relue après chaque échange.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";

/** Les trois fenêtres qui encadrent les messages, de la plus courte à la plus
 *  longue. Le même ordre que `core/quotas.py`, et pour la même raison. */
const FENETRES_MESSAGES = ["messages_5h", "messages", "messages_semaine"];

type Quota = {
  utilise: number;
  plafond: number;
  illimite: boolean;
  restant: number | null;
  fenetre: string;
  secondes_restantes: number | null;
};

type Etat = {
  plan: { code: string; nom: string };
  quotas: Record<string, Quota>;
};

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

const LIBELLES: Record<string, string> = {
  messages_5h: "Limite de 5 heures atteinte",
  messages: "Limite quotidienne atteinte",
  messages_semaine: "Limite hebdomadaire atteinte",
};

export function JaugeUsage({ signal }: { signal?: number }) {
  const [etat, setEtat] = useState<Etat | null>(null);

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch(`${API_BASE}/abonnements/moi`, {
        headers: authHeaders(),
      });
      if (!reponse.ok) return;
      const charge = await reponse.json();
      if (charge?.data) setEtat(charge.data as Etat);
    } catch {
      // Le bandeau est un secours. Il ne fait jamais de bruit : c'est le
      // serveur qui refuse pour de bon, pas cet affichage.
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire, signal]);

  // ── QUAND SE MONTRER ─────────────────────────────────────────────────
  //
  // Une seule condition : une fenêtre est PLEINE. Tant qu'il reste ne
  // serait-ce qu'un message, l'interface reste nue.
  if (!etat) return null;

  const pleines = FENETRES_MESSAGES.map((cle) => ({ cle, q: etat.quotas?.[cle] }))
    .filter(({ q }) => q && !q.illimite && q.plafond > 0 && (q.restant ?? 0) <= 0);

  if (!pleines.length) return null;

  // Plusieurs limites pleines : on cite celle qui repart le plus tôt. C'est la
  // seule échéance qui aide — savoir que l'hebdomadaire repart dans six jours
  // n'apprend rien à qui pourra réécrire dans deux heures.
  const bloquante = pleines.reduce((meilleur, courant) => {
    const a = courant.q!.secondes_restantes ?? Number.MAX_SAFE_INTEGER;
    const b = meilleur.q!.secondes_restantes ?? Number.MAX_SAFE_INTEGER;
    return a < b ? courant : meilleur;
  });

  const q = bloquante.q!;
  const titre = LIBELLES[bloquante.cle] ?? "Limite atteinte";

  return (
    <div
      className="mx-auto mt-2 flex w-full max-w-[var(--chat-measure)] flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] px-3 py-2 text-[12.5px]"
      style={{
        background: "var(--danger-bg, rgba(192,87,58,0.08))",
        border: "1px solid var(--danger-border, rgba(192,87,58,0.24))",
        color: "var(--text-secondary)",
      }}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true" className="shrink-0" style={{ color: "var(--danger, #c0573a)" }}>
        {/* Un rond barré : le geste est refusé, ce n'est pas une panne. */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      </span>

      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{titre}</span>
      <span className="tabular-nums" style={{ color: "var(--text-tertiary)" }}>
        {q.utilise} messages sur {q.plafond}
      </span>

      {q.secondes_restantes ? (
        <span style={{ color: "var(--text-tertiary)" }}>
          · reprise dans {enClair(q.secondes_restantes)}
        </span>
      ) : null}

      {/* « POURQUOI SUIS-JE BLOQUÉ » SE POSE AVANT « COMBIEN ÇA COÛTE ».
          La page d'usage explique la règle, montre les autres compteurs, et
          porte le lien vers les offres quand il a un sens. */}
      <Link
        href="/usage"
        className="ml-auto shrink-0 underline underline-offset-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Détails
      </Link>
    </div>
  );
}
