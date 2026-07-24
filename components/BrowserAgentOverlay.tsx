"use client";

import { useEffect, useRef, useState } from "react";
import {
  cancelTask,
  confirmTask,
  getTask,
  startTask,
  type BrowserTask,
  type BrowserStep,
} from "@/lib/agent-api";
import { Logo } from "./Logo";

const TERMINAL = new Set(["done", "error", "cancelled"]);

/** Actions internes qui correspondent à un vrai jalon visible pour
 * l'utilisateur — tout le reste (retries, échecs de décision, réflexion
 * intermédiaire) est condensé dans l'indicateur "En réflexion…" plutôt que
 * déversé en transcript brut façon logs de debug. */
const MILESTONE_ACTIONS = new Set(["navigate", "click", "fill", "select", "extract", "done"]);

function domainFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Libellé humain d'une étape jalon — jamais de détail interne (index DOM,
 * sélecteur) affiché tel quel. */
function stepLabel(step: BrowserStep): string {
  if (step.thought) return step.thought;
  switch (step.action) {
    case "navigate":
      return "Ouverture de la page…";
    case "click":
      return "Interaction avec la page…";
    case "extract":
      return "Lecture du contenu…";
    case "done":
      return "Synthèse de la réponse…";
    default:
      return "Étape suivante…";
  }
}

/** Fenêtre dédiée de l'Agent Navigateur — invoquée automatiquement par le
 * chat quand l'utilisateur demande une navigation web. Montre le parcours en
 * direct : étapes animées, URL courante, confirmation des actions sensibles. */
export function BrowserAgentOverlay({
  goal,
  onClose,
}: {
  goal: string;
  onClose: (answer?: string) => void;
}) {
  const [task, setTask] = useState<BrowserTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    startTask(goal)
      .then((t) => {
        if (cancelled) return;
        setTask(t);
        pollRef.current = setInterval(async () => {
          const cur = await getTask(t.id).catch(() => null);
          if (!cur) return;
          setTask(cur);
          if (TERMINAL.has(cur.status) && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }, 2000);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Impossible de lancer l'agent."),
      );
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task?.steps.length]);

  const running = task && !TERMINAL.has(task.status);

  async function stop() {
    if (task && running) await cancelTask(task.id).catch(() => {});
    onClose(task?.answer || undefined);
  }

  async function respond(approve: boolean) {
    if (!task) return;
    await confirmTask(task.id, approve).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Agent Navigateur"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        {/* En-tête animé */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <span className="relative flex h-10 w-10 items-center justify-center">
            {running && (
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-20"
                style={{ background: "var(--primary)" }}
                aria-hidden="true"
              />
            )}
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            >
              <Logo size={22} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Agent Navigateur</p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {task?.current_url || goal}
            </p>
          </div>
          {running && (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--primary)" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--primary)" }} />
              Navigation…
            </span>
          )}
        </div>

        {/* Parcours en direct */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          {!task && !error && (
            <div className="space-y-3" aria-hidden="true">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-[var(--card)]" />
              ))}
            </div>
          )}
          {(() => {
            const steps = task?.steps || [];
            // Ne montrer que les jalons concrets (navigation, clic, extraction,
            // conclusion) — les retries/échecs de décision internes sont des
            // détails d'implémentation, pas une information utile pour
            // l'utilisateur. On les condense dans l'indicateur de réflexion.
            const milestones = steps.filter((s) => MILESTONE_ACTIONS.has(s.action));
            const trailingThinking =
              running && steps.length > 0 && !MILESTONE_ACTIONS.has(steps[steps.length - 1].action);
            return (
              <>
                {milestones.map((s, i) => (
                  <div key={s.index} className="animate-fade-in mb-3 flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm">{stepLabel(s)}</p>
                    </div>
                  </div>
                ))}
                {trailingThinking && (
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                    >
                      <span
                        className="h-2 w-2 animate-pulse rounded-full"
                        style={{ background: "var(--primary)" }}
                      />
                    </span>
                    <p className="text-sm text-[var(--text-tertiary)]">Réflexion en cours…</p>
                  </div>
                )}
              </>
            );
          })()}

          {task?.status === "needs_confirmation" && (
            <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-sm font-medium">
                {task.pending_action?.question || "L'agent demande votre confirmation pour continuer."}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => respond(true)}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  Autoriser
                </button>
                <button
                  onClick={() => respond(false)}
                  className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium"
                >
                  Refuser
                </button>
              </div>
            </div>
          )}

          {task?.status === "done" && task.answer && (
            <div className="animate-fade-in mt-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--success)" }}>
                ✓ Tâche terminée
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{task.answer}</p>
              {!!task.images?.length && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {task.images.map((url, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={url + i}
                      src={url}
                      alt="Image trouvée pendant la recherche"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              {!!task.sources?.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {task.sources.slice(0, 5).map((s, i) => (
                    <a
                      key={s.url + i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[160px] truncate rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                    >
                      {s.title || domainFromUrl(s.url)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {task?.status === "error" && (
            <div className="animate-fade-in mt-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--error)" }}>
                Tâche non terminée
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                {task.error || "Je n'ai pas réussi à mener cette recherche à bien. Essaie de reformuler ta demande, ou avec moins d'étapes à la fois."}
              </p>
            </div>
          )}
          <div ref={stepsEndRef} />
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={stop}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            {running ? "Arrêter" : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Détection d'une demande de navigation web — déclenche l'agent dédié.
 * Volontairement stricte pour ne pas capturer les questions normales. */
export function detectBrowserGoal(text: string): boolean {
  const t = text.trim();
  if (t.length < 10) return false;
  return (
    /\b(va|vas|allez|rends[- ]toi|navigue[rz]?|ouvre|connecte[- ]toi)\b.{0,24}\b(sur|au site|le site|à la page)\b/i.test(t) ||
    /\b(remplis?|compare[rz]?|cherche[rz]?|regarde[rz]?|extrais?)\b.{0,30}\b(site|page web|formulaire en ligne)\b/i.test(t) ||
    /\bhttps?:\/\/\S+/i.test(t) ||
    /\bwww\.\S+\.\w{2,}/i.test(t)
  );
}
