"use client";

import { useCallback, useEffect, useState } from "react";
import { listShares, revokeAllShares, unshareSession, type ShareEntry } from "@/lib/chat-api";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Panel, Row } from "./Rows";

/**
 * Les liens publics ouverts sur ses conversations.
 *
 * POURQUOI CETTE PAGE EXISTE
 * --------------------------
 * On pouvait créer un lien de partage depuis le menu d'une conversation, et
 * le refermer depuis ce même menu — à condition de se rappeler LAQUELLE on
 * avait partagée. Passé quelques semaines, personne ne s'en souvient. Un
 * partage fait en juillet restait donc ouvert au monde, indéfiniment, faute
 * d'un endroit où le retrouver.
 *
 * Un lien qu'on ne peut pas retrouver est un lien qu'on ne peut pas fermer.
 * C'est une question de contrôle sur ses propres données, pas de confort.
 */
export function SharesSection() {
  const { session } = useAuth();
  const invite = !session || session.is_guest;
  const [liens, setLiens] = useState<ShareEntry[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmerTout, setConfirmerTout] = useState(false);

  const charger = useCallback(() => {
    if (invite) {
      setLiens([]);
      return;
    }
    listShares()
      .then(setLiens)
      .catch((e) => {
        setLiens([]);
        setErreur(e instanceof Error ? e.message : "Chargement impossible");
      });
  }, [invite]);

  useEffect(charger, [charger]);

  async function copier(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(id);
      setTimeout(() => setCopie((c) => (c === id ? null : c)), 1600);
    } catch {
      setErreur("Copie impossible — sélectionnez le lien à la main.");
    }
  }

  async function fermer(entree: ShareEntry) {
    setEnCours(entree.session_id);
    setErreur(null);
    try {
      await unshareSession(entree.session_id);
      // On retire la ligne SEULEMENT après la réponse du serveur : afficher
      // un lien comme fermé alors qu'il répond encore serait le mensonge le
      // plus coûteux que cette page puisse faire.
      setLiens((l) => (l ?? []).filter((x) => x.session_id !== entree.session_id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Révocation impossible");
    } finally {
      setEnCours(null);
    }
  }

  async function toutFermer() {
    setConfirmerTout(false);
    setEnCours("*");
    setErreur(null);
    try {
      await revokeAllShares();
      setLiens([]);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Révocation impossible");
    } finally {
      setEnCours(null);
    }
  }

  if (invite) {
    return (
      <Panel title="Liens partagés">
        <Row
          label="Réservés aux comptes"
          description="Une session invitée ne conserve pas de conversations au-delà de l'appareil : il n'y a donc rien à partager par lien, ni à retirer."
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

      <Panel title="Liens actifs">
        {liens === null ? (
          <Row label="Chargement…" />
        ) : liens.length === 0 ? (
          <Row
            label="Aucun lien actif"
            description="Aucune de vos conversations n'est accessible par lien. Vous pouvez en partager une depuis son menu « … » dans la liste de gauche."
          />
        ) : (
          liens.map((l) => (
            <Row
              key={l.session_id}
              label={l.title || "Conversation sans titre"}
              description={[
                l.visibility === "public"
                  ? "Public — référençable"
                  : "Lien secret — seuls ceux qui l'ont peuvent lire",
                l.anonymous ? "votre nom est masqué" : "votre nom est visible",
                l.shared_at
                  ? `partagé le ${new Date(l.shared_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                >
                  Ouvrir
                </a>
                <button
                  onClick={() => copier(l.url, l.session_id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                >
                  {copie === l.session_id ? "Copié" : "Copier"}
                </button>
                <button
                  onClick={() => fermer(l)}
                  disabled={enCours !== null}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)] disabled:opacity-40"
                >
                  {enCours === l.session_id ? "…" : "Révoquer"}
                </button>
              </div>
            </Row>
          ))
        )}
      </Panel>

      {liens !== null && liens.length > 1 && (
        <Panel title="Tout révoquer">
          <Row
            label="Fermer tous les liens"
            description="Ce geste existe pour le moment où l'on réalise qu'on a partagé plus qu'on ne croyait. Les conversations restent intactes — seuls les liens cessent de fonctionner."
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
                  onClick={toutFermer}
                  disabled={enCours !== null}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
                  style={{ background: "var(--error)" }}
                >
                  {enCours === "*" ? "…" : `Révoquer les ${liens.length}`}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmerTout(true)}
                className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)]"
              >
                Tout révoquer
              </button>
            )}
          </Row>
        </Panel>
      )}

      <Panel title="Ce qu'un lien partage exactement">
        <Row
          label="Les messages, tels qu'ils étaient au partage"
          description="La page publique montre la conversation figée à l'instant du partage. Les messages ajoutés ensuite n'y apparaissent pas."
        />
        <Row
          label="Rien d'autre de votre compte"
          description="Ni vos autres conversations, ni vos souvenirs, ni vos connecteurs. Quand le partage est anonyme, votre nom n'est pas transmis non plus."
        />
        <Row
          label="Révoquer coupe l'accès immédiatement"
          description="Le lien cesse de répondre dès la révocation. En revanche, ce que quelqu'un a déjà lu ou recopié entre-temps vous échappe — c'est vrai de tout lien public, ici comme ailleurs."
        />
      </Panel>
    </>
  );
}
