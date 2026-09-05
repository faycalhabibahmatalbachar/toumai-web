"use client";

/**
 * LA JAUGE D'USAGE, SOUS LE CHAMP DE SAISIE.
 *
 * CE QU'ELLE RÉSOUT
 * ------------------
 * Les quotas existent côté serveur et refusent proprement. Sans rien à
 * l'écran, la personne les découvre au moment où on lui dit non, et ce
 * moment-là est toujours le mauvais : elle écrivait quelque chose. Une jauge
 * qui prévient à l'avance transforme un mur en information.
 *
 * ELLE NE S'AFFICHE PAS TOUT LE TEMPS, et c'est le point important. Tant qu'il
 * reste plus du quart du quota, elle reste muette : un compteur permanent
 * au-dessus d'un champ de saisie donne l'impression d'être surveillé pendant
 * qu'on écrit. Elle apparaît quand elle devient utile, c'est-à-dire quand la
 * fin approche.
 *
 * ELLE MONTRE LA FENÊTRE LA PLUS CONTRAIGNANTE. Trois limites encadrent les
 * messages : cinq heures, la journée, la semaine. Afficher les trois, c'est
 * un tableau de bord ; afficher celle qui bloquera en premier, c'est une
 * réponse. Et c'est aussi celle qui repart le plus tôt, donc la seule dont
 * l'heure de reprise intéresse quelqu'un.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";

/** En dessous de ce reste, la jauge se montre. Un quart : assez tôt pour
 *  changer ses plans, assez tard pour ne pas peser sur les vingt premiers
 *  messages. */
const SEUIL = 0.25;

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
  messages_5h: "sur cinq heures",
  messages: "aujourd’hui",
  messages_semaine: "cette semaine",
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
      // La jauge est un confort. Elle ne fait jamais de bruit.
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire, signal]);

  if (!etat) return null;

  // La plus contraignante : celle dont la part restante est la plus faible.
  let pire: { cle: string; q: Quota; part: number } | null = null;
  for (const cle of FENETRES_MESSAGES) {
    const q = etat.quotas?.[cle];
    if (!q || q.illimite || q.plafond <= 0) continue;
    const part = (q.restant ?? 0) / q.plafond;
    if (!pire || part < pire.part) pire = { cle, q, part };
  }

  if (!pire || pire.part > SEUIL) return null;

  const { q, cle, part } = pire;
  const epuise = (q.restant ?? 0) <= 0;

  return (
    <div
      className="mx-auto mt-1.5 flex w-full max-w-[var(--chat-measure)] items-center gap-2 px-2 text-[11.5px]"
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-1 w-14 shrink-0 overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(3, part * 100)}%`,
            background: epuise ? "var(--danger, #c0573a)" : "var(--primary)",
          }}
        />
      </span>

      <span style={{ color: "var(--text-tertiary)" }}>
        {epuise ? (
          <>
            Limite {LIBELLES[cle] ?? ""} atteinte
            {q.secondes_restantes
              ? `, ça repart dans ${enClair(q.secondes_restantes)}`
              : ""}
            .
          </>
        ) : (
          <>
            {q.restant} message{(q.restant ?? 0) > 1 ? "s" : ""}{" "}
            {LIBELLES[cle] ?? ""} sur {q.plafond}
          </>
        )}
      </span>

      {/* Le lien n'apparaît que sur le plan gratuit. Proposer de payer à
          quelqu'un qui paie déjà est une maladresse, et il arrive qu'un plan
          payant atteigne aussi sa limite de cinq heures. */}
      {etat.plan?.code === "gratuit" && (
        <Link
          href="/#tarifs"
          className="underline underline-offset-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Voir les offres
        </Link>
      )}
    </div>
  );
}
