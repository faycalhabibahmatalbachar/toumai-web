"use client";

import { useEffect, useState } from "react";
import { shareSession, unshareSession } from "@/lib/chat-api";

/**
 * Partage d'une conversation.
 *
 * DEUX DÉCISIONS, PAS UN FORMULAIRE
 * ----------------------------------
 * Qui peut lire, et sous quel nom. Le reste — la longue explication de ce
 * qu'est un lien, la mention des messages postérieurs — disait au moment du
 * partage des choses qui se comprennent mieux une fois le lien créé, et
 * transformait une action de deux secondes en page de conditions.
 */
export function ShareDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = useState<"unlisted" | "public">("unlisted");
  const [anonymous, setAnonymous] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Échap referme : une boîte modale qu'on ne peut fermer qu'à la souris
  // bloque la navigation au clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await shareSession(sessionId, { visibility, anonymous });
      setLink(`${window.location.origin}/share?c=${encodeURIComponent(res.token)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le lien n'a pas pu être créé.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      await unshareSession(sessionId);
      setLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le partage n'a pas pu être révoqué.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  /** Ouvre le partage du système (WhatsApp, mail, messages…) quand l'appareil
   * en propose un. Sinon on copie — et on le DIT, plutôt que de laisser croire
   * qu'un menu va s'ouvrir. */
  async function partager() {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Conversation Toumaï AI", url: link });
        return;
      } catch {
        // Partage refusé ou annulé : on retombe sur la copie, sans erreur —
        // annuler un partage n'est pas un échec.
      }
    }
    await copy();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Partager la conversation"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!link ? (
          <>
            <h2 className="landing-serif text-[22px] tracking-tight">
              Partager la conversation
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-tertiary)]">
              Les messages envoyés après le partage ne seront pas inclus.
            </p>

            <div className="mt-5 space-y-2">
              {(
                [
                  {
                    v: "unlisted" as const,
                    label: "Par lien privé",
                    desc: "Lisible seulement par les personnes à qui vous donnez le lien.",
                  },
                  {
                    v: "public" as const,
                    label: "Public",
                    desc: "Référençable par les moteurs de recherche.",
                  },
                ]
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setVisibility(o.v)}
                  aria-pressed={visibility === o.v}
                  className="flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition"
                  style={{
                    borderColor: visibility === o.v ? "var(--primary)" : "var(--border)",
                    background:
                      visibility === o.v
                        ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                        : undefined,
                  }}
                >
                  <span
                    className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      borderColor: visibility === o.v ? "var(--primary)" : "var(--border)",
                    }}
                    aria-hidden="true"
                  >
                    {visibility === o.v && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "var(--primary)" }}
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">{o.label}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-tertiary)]">
                      {o.desc}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3">
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">Masquer mon nom</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--text-tertiary)]">
                  La page ne montrera pas qui a écrit.
                </span>
              </span>
              <Switch
                checked={anonymous}
                onChange={setAnonymous}
                label="Masquer mon nom sur la page partagée"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-[14px] text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                onClick={createLink}
                disabled={busy}
                className="rounded-full px-5 py-2 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {busy ? "Création…" : "Créer le lien"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="landing-serif text-[22px] tracking-tight">Le lien est prêt</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-tertiary)]">
              {visibility === "public"
                ? "Cette conversation est publique et peut être référencée."
                : "Seules les personnes à qui vous donnez ce lien pourront la lire."}
            </p>

            <p className="mt-4 truncate rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-[13px] text-[var(--text-secondary)]">
              {link}
            </p>

            {/* Deux gestes, deux boutons. « Partager » ouvre le partage du
                système ; « Copier » sert quand on veut coller soi-même. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={partager}
                className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                <ShareIcon />
                Partager le lien
              </button>
              <button
                onClick={copy}
                className="flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-[14px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Lien copié" : "Copier le lien"}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={revoke}
                disabled={busy}
                className="text-[12.5px] font-medium text-[var(--error)] transition hover:opacity-80 disabled:opacity-50"
              >
                Désactiver le partage
              </button>
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-[14px] text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Fermer
              </button>
            </div>
          </>
        )}

        {error && <p className="mt-3 text-[12.5px] text-[var(--error)]">{error}</p>}
      </div>
    </div>
  );
}

/**
 * Interrupteur.
 *
 * La pastille se plaçait en `absolute` sans repère horizontal, puis se
 * déplaçait de vingt-deux pixels calculés à la main : elle partait de sa
 * position statique — celle qu'elle aurait eue dans le flux — et cette
 * position dépendait du contexte. D'où le décalage. Ici, un `left` explicite
 * fixe le point de départ, et la course s'exprime en unités de la piste.
 */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--primary)" : "var(--border)" }}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
