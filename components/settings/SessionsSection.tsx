"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { empreinteActuelle } from "@/lib/device-fingerprint";
import {
  listerSessions,
  oublierAppareil,
  toutDeconnecter,
  type AppareilSession,
} from "@/lib/user-api";
import { Panel, Row } from "./Rows";

/**
 * Les appareils depuis lesquels ce compte a été ouvert.
 *
 * POURQUOI CETTE PAGE MANQUAIT
 * -----------------------------
 * On enregistrait chaque appareil depuis longtemps — type, navigateur,
 * système, dernière visite — pour la console d'administration. L'utilisateur,
 * lui, n'y avait aucun accès : impossible de savoir depuis quels appareils son
 * compte était ouvert, ni de fermer quoi que ce soit.
 *
 * C'est la question qu'on se pose le jour où l'on doute, et ce jour-là il est
 * déjà tard.
 */
export function SessionsSection() {
  const { session, logout } = useAuth();
  const invite = !session || session.is_guest;

  const [appareils, setAppareils] = useState<AppareilSession[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [confirmerTout, setConfirmerTout] = useState(false);

  const charger = useCallback(() => {
    if (invite) return;
    let vivant = true;
    empreinteActuelle()
      .then((fp) => listerSessions(fp))
      .then((l) => {
        if (vivant) setAppareils(l);
      })
      .catch((e) => {
        if (!vivant) return;
        setAppareils([]);
        setErreur(e instanceof Error ? e.message : "Sessions indisponibles");
      });
    return () => {
      vivant = false;
    };
  }, [invite]);

  useEffect(charger, [charger]);

  async function retirer(a: AppareilSession) {
    setOccupe(a.id);
    setErreur(null);
    try {
      await oublierAppareil(a.id);
      setAppareils((l) => (l ?? []).filter((x) => x.id !== a.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setOccupe(null);
    }
  }

  async function deconnecterTout() {
    setConfirmerTout(false);
    setOccupe("*");
    setErreur(null);
    try {
      await toutDeconnecter();
      // On se déconnecte ICI aussi, et immédiatement. Rester sur un écran de
      // réglages après avoir « tout déconnecté » donnerait l'impression que
      // l'appareil courant a été épargné — alors qu'il ne l'est pas.
      logout();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Déconnexion impossible");
      setOccupe(null);
    }
  }

  if (invite) {
    return (
      <Panel title="Sessions actives">
        <Row
          label="Réservées aux comptes"
          description="Une session invitée vit sur cet appareil seulement : il n'y a pas d'autre session à consulter ni à fermer."
        >
          <Link
            href="/register"
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
            style={{ background: "var(--primary)" }}
          >
            Créer un compte
          </Link>
        </Row>
      </Panel>
    );
  }

  return (
    <>
      {erreur && (
        <p className="mb-4 rounded-xl border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
          {erreur}
        </p>
      )}

      <Panel title="Appareils">
        {appareils === null ? (
          <Row label="Chargement…" />
        ) : appareils.length === 0 ? (
          <Row
            label="Aucun appareil enregistré"
            description="Rien à afficher pour l'instant."
          />
        ) : (
          appareils.map((a) => (
            <Row
              key={a.id}
              label={decrireAppareil(a)}
              description={[
                [a.os, a.browser].filter(Boolean).join(" · "),
                a.last_seen ? `vu ${dateDite(a.last_seen)}` : null,
                a.sessions > 1 ? `${a.sessions} connexions` : null,
              ]
                .filter(Boolean)
                .join(" — ")}
            >
              <div className="flex shrink-0 items-center gap-2">
                {a.current && (
                  <span className="rounded-full bg-[var(--hover)] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                    Session actuelle
                  </span>
                )}
                {!a.current && (
                  /* « RETIRER », PAS « DÉCONNECTER » — ET C'EST IMPORTANT.
                     Les jetons de rafraîchissement ne portent pas l'empreinte
                     de l'appareil : rien ne permet aujourd'hui de fermer
                     CELUI-LÀ sans fermer les autres. Ce bouton efface l'entrée
                     de la liste, il ne ferme pas la session.

                     L'appeler « Déconnecter » ferait croire à quelqu'un qu'il
                     a chassé un intrus resté connecté. La seule vraie
                     déconnexion est celle du bas. */
                  <button
                    onClick={() => retirer(a)}
                    disabled={occupe !== null}
                    title="Retire l'appareil de cette liste — ne ferme pas sa session"
                    className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                  >
                    {occupe === a.id ? "…" : "Retirer"}
                  </button>
                )}
              </div>
            </Row>
          ))
        )}
      </Panel>

      <Panel title="Tout déconnecter">
        <Row
          label="Fermer toutes les sessions"
          description="Sur tous les appareils, y compris celui-ci. Utile si vous avez ouvert votre compte ailleurs et que vous n'y avez plus accès."
        >
          {confirmerTout ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setConfirmerTout(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                onClick={deconnecterTout}
                disabled={occupe !== null}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
                style={{ background: "var(--error)" }}
              >
                {occupe === "*" ? "…" : "Tout déconnecter"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmerTout(true)}
              className="shrink-0 rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)]"
            >
              Tout déconnecter
            </button>
          )}
        </Row>
        {/* LE DÉLAI EST DIT, PARCE QU'IL EXISTE.
            Un jeton d'accès déjà émis se vérifie sans consulter la base —
            c'est ce qui le rend rapide — et reste donc valide jusqu'à son
            expiration. Sans cette phrase, quelqu'un qui vient de tout fermer
            verrait l'autre appareil répondre encore et croirait l'opération
            ratée. */}
        <Row
          label="Ce que cela fait, exactement"
          description="Plus aucune session ne peut être prolongée. Une session déjà ouverte ailleurs peut toutefois répondre encore quelques minutes, le temps que son jeton expire — c'est la contrepartie d'une vérification qui ne passe pas par la base à chaque appel."
        />
      </Panel>
    </>
  );
}

/** « Ordinateur Windows » plutôt que « desktop / Win32 ». */
function decrireAppareil(a: AppareilSession): string {
  const type =
    a.device_type === "mobile"
      ? "Téléphone"
      : a.device_type === "tablet"
        ? "Tablette"
        : a.device_type === "desktop"
          ? "Ordinateur"
          : "Appareil";
  return [type, a.os].filter(Boolean).join(" · ");
}

/** « aujourd'hui à 11:19 » plutôt qu'une date ISO. */
function dateDite(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "récemment";
  const auj = new Date();
  const memeJour = d.toDateString() === auj.toDateString();
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (memeJour) return `aujourd'hui à ${heure}`;
  return `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${heure}`;
}
