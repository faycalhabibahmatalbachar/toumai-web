"use client";

import { useState } from "react";
import { shareSession, unshareSession } from "@/lib/chat-api";

/** Boîte de partage d'une conversation — règles de confidentialité choisies
 * PAR l'utilisateur au moment du partage, comme Gemini :
 *  - visibilité : lien secret (non répertorié) ou public ;
 *  - anonymat : afficher ou non son nom sur la page partagée. */
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

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await shareSession(sessionId, { visibility, anonymous });
      setLink(`${window.location.origin}/share?c=${encodeURIComponent(res.token)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le partage a échoué.");
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
      setError(err instanceof Error ? err.message : "La révocation a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <h2 className="landing-serif text-xl tracking-tight">Partager la conversation</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-tertiary)]">
          Toute personne disposant du lien pourra lire cette conversation. Les
          messages envoyés après le partage ne sont pas inclus tant que vous ne
          repartagez pas.
        </p>

        {!link ? (
          <>
            <div className="mt-5 space-y-2">
              {(
                [
                  {
                    v: "unlisted" as const,
                    label: "Lien secret",
                    desc: "Seules les personnes ayant le lien peuvent lire — non indexé.",
                  },
                  {
                    v: "public" as const,
                    label: "Public",
                    desc: "Le lien peut être découvert et indexé par les moteurs de recherche.",
                  },
                ]
              ).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setVisibility(o.v)}
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
                    className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: visibility === o.v ? "var(--primary)" : "var(--border)" }}
                    aria-hidden="true"
                  >
                    {visibility === o.v && (
                      <span className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-[var(--text-tertiary)]">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 px-1">
              <span>
                <span className="block text-sm font-medium">Rester anonyme</span>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  Votre nom n'apparaîtra pas sur la page partagée.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={anonymous}
                onClick={() => setAnonymous((a) => !a)}
                className="relative h-6 w-11 shrink-0 rounded-full transition"
                style={{ background: anonymous ? "var(--primary)" : "var(--border)" }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                  style={{ transform: anonymous ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                onClick={createLink}
                disabled={busy}
                className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {busy ? "Création…" : "Créer le lien"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">{link}</span>
              <button
                onClick={copy}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={revoke}
                disabled={busy}
                className="text-xs font-medium text-[var(--error)] transition hover:opacity-80 disabled:opacity-50"
              >
                Révoquer le partage
              </button>
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Fermer
              </button>
            </div>
          </>
        )}

        {error && <p className="mt-3 text-xs text-[var(--error)]">{error}</p>}
      </div>
    </div>
  );
}
