"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { http } from "@/lib/http";

const MAX = 2000;

/**
 * « Que s'est-il passé ? » — signaler un problème.
 *
 * POURQUOI CE CHEMIN MANQUAIT
 * ----------------------------
 * Il existait un pouce-haut/pouce-bas sur les réponses, et un signalement pour
 * les images. Rien pour le reste : un bouton qui ne marche pas, une page qui
 * se fige, un texte qui n'a aucun sens. Ces défauts-là ne remontaient que si
 * quelqu'un pensait à écrire un courriel — c'est-à-dire presque jamais.
 *
 * Un produit sans chemin de retour n'apprend que de ses utilisateurs les plus
 * tenaces. Ce ne sont pas eux qui rencontrent le plus de problèmes.
 */
export function Signalement({ onClose }: { onClose: () => void }) {
  const [texte, setTexte] = useState("");
  const [avecCapture, setAvecCapture] = useState(true);
  const [capture, setCapture] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [onClose]);

  /** Fabrique la capture DANS le navigateur, à partir du DOM.
   *
   * L'API `getDisplayMedia` demanderait à la personne de choisir une fenêtre
   * dans une boîte système, alors qu'elle vient de cliquer sur « signaler » :
   * un second consentement pour le geste qu'elle est en train de faire.
   *
   * On dessine donc une vignette du texte visible sur un canevas. C'est moins
   * fidèle qu'une vraie capture — et c'est assumé : ce qu'on cherche, c'est
   * de savoir OÙ la personne était et ce qu'elle voyait, pas de reproduire son
   * écran au pixel près. Aucune extension, aucune permission, et rien ne part
   * si la case est décochée.
   */
  const fabriquerCapture = useCallback(() => {
    try {
      const l = 640;
      const h = 400;
      const c = document.createElement("canvas");
      c.width = l;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      const styles = getComputedStyle(document.body);
      ctx.fillStyle = styles.backgroundColor || "#111";
      ctx.fillRect(0, 0, l, h);
      ctx.fillStyle = styles.color || "#eee";
      ctx.font = "13px system-ui, sans-serif";
      const lignes = (document.body.innerText || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 26);
      lignes.forEach((ligne, i) => {
        ctx.fillText(ligne.slice(0, 84), 14, 24 + i * 14.5);
      });
      return c.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setCapture(avecCapture ? fabriquerCapture() : null);
  }, [avecCapture, fabriquerCapture]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const msg = texte.trim();
    if (!msg) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await http.post("/report", {
        message: msg,
        page_url: window.location.href,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || null,
        screenshot: avecCapture ? capture : null,
      });
      setEnvoye(true);
      // On laisse l'accusé de réception à l'écran deux secondes : fermer
      // aussitôt laisserait un doute sur ce qui vient de se passer.
      setTimeout(onClose, 1900);
    } catch (err) {
      // LE TEXTE RESTE À L'ÉCRAN. La personne a écrit un paragraphe ; il ne
      // doit pas disparaître sans qu'elle sache qu'il faut recommencer.
      setErreur(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer. Votre texte est toujours là — réessayez.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (!boite.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-label="Signaler un problème"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">Que s&apos;est-il passé ?</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        {envoye ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium">Signalement envoyé.</p>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Merci — c&apos;est comme ça qu&apos;on répare ce qu&apos;on ne voit
              pas depuis l&apos;intérieur.
            </p>
          </div>
        ) : (
          <form onSubmit={envoyer} className="px-5 py-4">
            <textarea
              autoFocus
              value={texte}
              onChange={(e) => setTexte(e.target.value.slice(0, MAX))}
              placeholder="Donnez-nous des précisions sur le problème rencontré"
              rows={7}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm leading-relaxed outline-none transition focus:border-[var(--primary)]"
            />
            <p className="mt-1.5 text-right text-xs text-[var(--text-tertiary)]">
              {texte.length} / {MAX} caractères utilisés
            </p>

            <p className="mt-3 text-xs leading-relaxed text-[var(--text-tertiary)]">
              Ce que vous envoyez est lu pour corriger le produit. N&apos;y
              mettez pas de mot de passe ni de coordonnées bancaires — nous
              n&apos;en avons jamais besoin.
            </p>

            {/* LA CASE EST COCHÉE, MAIS L'APERÇU EST MONTRÉ.
                Une case pré-cochée n'est un consentement que si l'on voit ce
                qu'elle envoie. L'aperçu est là, à côté, avant l'envoi. */}
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={avecCapture}
                onChange={(e) => setAvecCapture(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Inclure la capture d&apos;écran dans le rapport
            </label>

            {avecCapture && capture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capture}
                alt="Aperçu de ce qui sera envoyé"
                className="mt-3 w-full max-w-[280px] rounded-lg border border-[var(--border)]"
              />
            )}
            {avecCapture && !capture && (
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                La capture n&apos;a pas pu être produite sur cet appareil. Le
                reste du signalement partira quand même.
              </p>
            )}

            {erreur && <p className="mt-3 text-sm text-[var(--error)]">{erreur}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!texte.trim() || envoi}
                className="rounded-full px-5 py-2 text-sm font-medium text-white transition disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                {envoi ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
