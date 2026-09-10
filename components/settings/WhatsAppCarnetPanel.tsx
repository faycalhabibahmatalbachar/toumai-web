"use client";

import { useEffect, useMemo, useState } from "react";
import { getWaCarnet, syncWaCarnet, type WaCarnet } from "@/lib/connectors-api";
import { WhatsAppIcon } from "./BrandIcons";
import { cxScopeClass, cxScopeStyle, cxDisplayStyle } from "./cx-fonts";

/** Le carnet d'adresses WhatsApp que Toumaï connaît, et le bouton qui le met à jour.
 *
 * POURQUOI CET ÉCRAN EXISTE
 * --------------------------
 * Le carnet ne vivait que dans la mémoire de la passerelle. Personne ne pouvait
 * donc voir combien de contacts Toumaï connaissait, ni depuis quand, ni relancer
 * la synchronisation autrement qu'en le demandant à l'assistant — c'est-à-dire
 * en espérant qu'il choisisse le bon outil.
 *
 * Quand quelqu'un dit « Toumaï ne connaît pas le numéro de Mahamat », la
 * première chose à regarder est la date de la dernière synchronisation. Elle est
 * ici, en une ligne, avec le bouton juste en dessous.
 */
export function WhatsAppCarnetPanel({ onClose }: { onClose: () => void }) {
  const [carnet, setCarnet] = useState<WaCarnet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terme, setTerme] = useState("");
  const [enSynchro, setEnSynchro] = useState(false);
  const [resultat, setResultat] = useState<string | null>(null);

  useEffect(() => {
    getWaCarnet()
      .then(setCarnet)
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"));
  }, []);

  // LE FILTRE EST LOCAL, ET C'EST DÉLIBÉRÉ. Le serveur sait filtrer, mais un
  // aller-retour par lettre saisie rendrait la frappe hachée pour un gain nul :
  // les contacts sont déjà tous là.
  const visibles = useMemo(() => {
    const q = terme.trim().toLowerCase();
    if (!carnet) return [];
    if (!q) return carnet.contacts;
    return carnet.contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.number || "").includes(q),
    );
  }, [carnet, terme]);

  async function synchroniser() {
    if (enSynchro) return;
    setEnSynchro(true);
    setError(null);
    setResultat(null);
    try {
      const res = await syncWaCarnet();
      // ON DIT CE QUI S'EST PASSÉ, PAS « TERMINÉ ».
      //
      // Une synchronisation qui ramène zéro contact et affiche « terminé »
      // laisse croire à une réussite, alors que c'est précisément le cas où il
      // faut regarder ailleurs.
      setResultat(
        res.synchronises === 0
          ? "Aucun contact reçu de la passerelle. Le carnet n'a pas changé."
          : `${res.synchronises} contact${res.synchronises > 1 ? "s" : ""} synchronisé${
              res.synchronises > 1 ? "s" : ""
            }${res.nouveaux ? `, dont ${res.nouveaux} nouveau${res.nouveaux > 1 ? "x" : ""}` : ""}.`,
      );
      setCarnet(await getWaCarnet());
    } catch (err) {
      setError(err instanceof Error ? err.message : "La synchronisation n'a pas abouti");
    } finally {
      setEnSynchro(false);
    }
  }

  return (
    <div
      className={`${cxScopeClass} fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm`}
      style={cxScopeStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Carnet WhatsApp"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-[var(--cx-border-default)] bg-[var(--cx-surface)]"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3.5 border-b border-[var(--cx-border-subtle)] px-6 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            aria-hidden="true"
          >
            <WhatsAppIcon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="text-[19px] font-medium tracking-[-0.01em] text-[var(--cx-text-primary)]"
              style={cxDisplayStyle}
            >
              Carnet WhatsApp
            </h2>
            <p className="text-xs text-[var(--cx-text-muted)]">
              Les contacts que Toumaï AI peut retrouver par leur nom.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p
              className="mb-4 rounded-[10px] border px-3 py-2 text-[13px]"
              style={{
                color: "var(--cx-error-text)",
                background: "var(--cx-error-bg)",
                borderColor: "var(--cx-error-border)",
              }}
            >
              {error}
            </p>
          )}

          <div className="rounded-[12px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[17px] font-semibold text-[var(--cx-text-primary)]">
                {carnet ? `${carnet.total_en_base} contact${carnet.total_en_base > 1 ? "s" : ""}` : "…"}
              </p>
              {carnet?.source === "base" && (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    color: "var(--cx-warn-text)",
                    background: "var(--cx-warn-bg)",
                    borderColor: "var(--cx-warn-border)",
                  }}
                >
                  Hors ligne
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-[var(--cx-text-secondary)]">
              {!carnet
                ? "Chargement…"
                : carnet.derniere_synchronisation
                  ? `Dernière synchronisation : ${quand(carnet.derniere_synchronisation)}.`
                  : "Jamais synchronisé. Toumaï ne peut donc pas retrouver quelqu'un par son nom tant que la passerelle est coupée."}
            </p>
            {carnet?.source === "base" && (
              /* LE DIRE PLUTÔT QUE DE LE TAIRE. Une liste datée présentée comme
                 fraîche fait chercher un contact récent qui n'y sera jamais. */
              <p className="mt-1 text-[12px]" style={{ color: "var(--cx-warn-text)" }}>
                La passerelle ne répond pas : cette liste vient de la copie enregistrée. Les
                contacts ajoutés depuis n&apos;y sont pas.
              </p>
            )}
            <button
              onClick={synchroniser}
              disabled={enSynchro}
              className="mt-3.5 w-full rounded-[10px] px-4 py-2.5 text-[14px] font-semibold text-white transition disabled:opacity-60"
              style={{ background: "#25D366" }}
            >
              {enSynchro ? "Synchronisation…" : "Synchroniser les contacts"}
            </button>
            {resultat && (
              <p className="mt-2 text-[12.5px] text-[var(--cx-text-secondary)]">{resultat}</p>
            )}
          </div>

          <input
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Chercher un nom ou un numéro"
            className="mt-5 w-full rounded-[10px] border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3.5 py-2.5 text-[14px] text-[var(--cx-text-primary)] outline-none placeholder:text-[var(--cx-text-muted)]"
          />

          <ul className="mt-4 divide-y divide-[var(--cx-border-subtle)]">
            {visibles.slice(0, 300).map((c) => (
              <li key={c.jid} className="flex items-center gap-3 py-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-[var(--cx-text-secondary)]"
                  style={{ background: "var(--cx-hover)" }}
                  aria-hidden="true"
                >
                  {(c.name || "#").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[var(--cx-text-primary)]">
                    {c.name}
                  </span>
                  {/* SANS NUMÉRO, ON LE DIT — une ligne vide se lirait comme un
                      défaut d'affichage, alors que le numéro n'existe pas. */}
                  <span
                    className={`block text-[12px] text-[var(--cx-text-muted)] ${
                      c.number ? "" : "italic"
                    }`}
                  >
                    {c.number ? `+${c.number}` : "Numéro non communiqué par WhatsApp"}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {carnet && visibles.length === 0 && (
            <p className="py-8 text-center text-[13px] text-[var(--cx-text-muted)]">
              {terme
                ? "Aucun contact synchronisé ne porte ce nom. Si la personne vous a écrit récemment, synchronisez à nouveau."
                : /* ON NE DIT PAS « VOUS N'AVEZ AUCUN CONTACT » : c'est faux, et
                     vérifiable en ouvrant WhatsApp. Un carnet vide ici veut dire
                     « jamais synchronisé », ce qui appelle un geste. */
                  "Toumaï n'a pas encore recopié votre carnet. Lancez une synchronisation."}
            </p>
          )}

          {visibles.length > 300 && (
            <p className="pt-3 text-center text-[12px] text-[var(--cx-text-muted)]">
              … et {visibles.length - 300} autres. Utilisez la recherche.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function quand(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "date inconnue";
  const ecart = Date.now() - t;
  const min = Math.floor(ecart / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? "hier" : `il y a ${j} jours`;
}
