"use client";

/**
 * Bandeau de quota conversationnel.
 *
 * Source de vérité : `/abonnements/moi`. Le navigateur n'invente aucun compteur
 * et ne calcule aucune fenêtre métier. Le serveur fournit l'usage, le niveau
 * d'alerte, `reset_at` et le fuseau de référence.
 *
 * UX :
 * - normal (<80 %) : rien ;
 * - warning (>=80 %) : alerte discrète ;
 * - critical (>=95 %) : alerte forte ;
 * - blocked (>=100 %) : blocage explicite + heure de reprise ;
 * - critical/blocked : opt-in explicite pour recevoir un e-mail au reset.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { authHeaders } from "@/lib/api";
import { API_BASE } from "@/lib/config";

const FENETRES_MESSAGES = ["messages_5h", "messages", "messages_semaine"] as const;
type CleMessage = (typeof FENETRES_MESSAGES)[number];
type Niveau = "normal" | "warning" | "critical" | "blocked";

type Quota = {
  utilise: number;
  plafond: number;
  illimite: boolean;
  restant: number | null;
  fenetre: string;
  secondes_restantes: number | null;
  usage_ratio?: number | null;
  alert_level?: Niveau;
  reset_at?: string | null;
  timezone?: string;
};

type Etat = {
  timezone?: string;
  server_now?: string;
  plan: { code: string; nom: string };
  quotas: Record<string, Quota>;
};

const POIDS: Record<Niveau, number> = {
  normal: 0,
  warning: 1,
  critical: 2,
  blocked: 3,
};

const LIBELLES: Record<CleMessage, string> = {
  messages_5h: "sur cette période",
  messages: "aujourd’hui",
  messages_semaine: "cette semaine",
};

function niveauDe(q: Quota): Niveau {
  if (q.alert_level) return q.alert_level;
  if (q.illimite || q.plafond <= 0) return "normal";
  const ratio = q.plafond ? q.utilise / q.plafond : 0;
  if (ratio >= 1) return "blocked";
  if (ratio >= 0.95) return "critical";
  if (ratio >= 0.8) return "warning";
  return "normal";
}

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

function heureReset(resetAt: string | null | undefined, timezone: string | undefined): string | null {
  if (!resetAt) return null;
  try {
    const date = new Date(resetAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone || "Africa/Ndjamena",
    }).format(date);
  } catch {
    return null;
  }
}

export function JaugeUsage({ signal }: { signal?: number }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [notificationEnCours, setNotificationEnCours] = useState<CleMessage | null>(null);
  const [notificationActive, setNotificationActive] = useState<CleMessage | null>(null);
  const [notificationErreur, setNotificationErreur] = useState<string | null>(null);

  const relire = useCallback(async () => {
    try {
      const reponse = await fetch(`${API_BASE}/abonnements/moi`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!reponse.ok) return;
      const charge = await reponse.json();
      if (charge?.data) setEtat(charge.data as Etat);
    } catch {
      // Ce composant informe, il n'autorise ni ne refuse. Le serveur reste le garde.
    }
  }, []);

  const demanderNotification = useCallback(async (cle: CleMessage) => {
    setNotificationEnCours(cle);
    setNotificationErreur(null);
    try {
      const reponse = await fetch(`${API_BASE}/abonnements/quota/${cle}/notify-reset`, {
        method: "POST",
        headers: authHeaders(),
      });
      const charge = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        const message = charge?.detail || charge?.error?.message || "Impossible d’activer l’e-mail pour le moment.";
        setNotificationErreur(String(message));
        return;
      }
      setNotificationActive(cle);
    } catch {
      setNotificationErreur("Impossible d’activer l’e-mail pour le moment.");
    } finally {
      setNotificationEnCours(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void relire();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [relire, signal]);

  const selection = useMemo(() => {
    if (!etat) return null;

    const candidats = FENETRES_MESSAGES.map((cle) => {
      const q = etat.quotas?.[cle];
      return q ? { cle, q, niveau: niveauDe(q) } : null;
    }).filter(Boolean) as Array<{ cle: CleMessage; q: Quota; niveau: Niveau }>;

    const visibles = candidats.filter(({ niveau }) => POIDS[niveau] > 0);
    if (!visibles.length) return null;

    return visibles.reduce((meilleur, courant) => {
      const diff = POIDS[courant.niveau] - POIDS[meilleur.niveau];
      if (diff > 0) return courant;
      if (diff < 0) return meilleur;
      const a = courant.q.secondes_restantes ?? Number.MAX_SAFE_INTEGER;
      const b = meilleur.q.secondes_restantes ?? Number.MAX_SAFE_INTEGER;
      return a < b ? courant : meilleur;
    });
  }, [etat]);

  if (!etat || !selection) return null;

  const { cle, q, niveau } = selection;
  const restant = Math.max(0, q.restant ?? q.plafond - q.utilise);
  const timezone = q.timezone || etat.timezone || "Africa/Ndjamena";
  const reset = heureReset(q.reset_at, timezone);

  const copy = (() => {
    if (niveau === "blocked") {
      return {
        titre: "Trop de demandes pour cette période",
        detail: `Vous avez utilisé vos ${q.plafond} messages ${LIBELLES[cle]}.`,
      };
    }
    if (niveau === "critical") {
      return {
        titre: restant === 1 ? "Plus qu’un message disponible" : `Plus que ${restant} messages disponibles`,
        detail: `La limite ${LIBELLES[cle]} approche.`,
      };
    }
    return {
      titre: "Vous approchez de votre limite",
      detail: `${restant} messages restent ${LIBELLES[cle]}.`,
    };
  })();

  const danger = niveau === "blocked" || niveau === "critical";
  const background = danger
    ? "var(--danger-bg, rgba(192,87,58,0.08))"
    : "rgba(217,164,65,0.10)";
  const border = danger
    ? "var(--danger-border, rgba(192,87,58,0.24))"
    : "rgba(217,164,65,0.32)";
  const peutNotifier = danger && Boolean(q.reset_at || q.secondes_restantes);
  const notificationDeCetteFenetre = notificationActive === cle;

  return (
    <div
      className="mx-auto mt-2 flex w-full max-w-[var(--chat-measure)] flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] px-3 py-2 text-[12.5px]"
      style={{ background, border: `1px solid ${border}`, color: "var(--text-secondary)" }}
      role="status"
      aria-live="polite"
      data-quota-level={niveau}
    >
      <span aria-hidden="true" className="shrink-0" style={{ color: danger ? "var(--danger, #c0573a)" : "#a66b00" }}>
        {niveau === "blocked" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 2.8 19h18.4L12 3Z" />
            <path d="M12 9v4" />
            <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        )}
      </span>

      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{copy.titre}</span>
      <span style={{ color: "var(--text-tertiary)" }}>{copy.detail}</span>

      {reset ? (
        <span style={{ color: "var(--text-tertiary)" }}>
          · reprise le {reset} (heure de N’Djamena)
        </span>
      ) : q.secondes_restantes ? (
        <span style={{ color: "var(--text-tertiary)" }}>· reprise dans {enClair(q.secondes_restantes)}</span>
      ) : null}

      {peutNotifier ? (
        notificationDeCetteFenetre ? (
          <span className="shrink-0" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            · E-mail activé
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void demanderNotification(cle)}
            disabled={notificationEnCours === cle}
            className="shrink-0 underline underline-offset-2 disabled:cursor-wait disabled:opacity-60"
            style={{ color: "var(--text-secondary)" }}
          >
            {notificationEnCours === cle ? "Activation…" : "Me prévenir par e-mail"}
          </button>
        )
      ) : null}

      {notificationErreur ? (
        <span className="basis-full" style={{ color: "var(--danger, #c0573a)" }}>
          {notificationErreur}
        </span>
      ) : null}

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
