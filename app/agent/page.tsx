"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import {
  cancelTask,
  confirmTask,
  getAgentAvailability,
  getTask,
  startTask,
  type BrowserTask,
} from "@/lib/agent-api";

const TERMINAL = new Set(["done", "error", "cancelled"]);

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  running: "En cours…",
  needs_confirmation: "Confirmation requise",
  done: "Terminée",
  error: "Erreur",
  cancelled: "Annulée",
};

export default function AgentPage() {
  const { session, loading } = useAuth();
  useExigerCompte();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [goal, setGoal] = useState("");
  const [task, setTask] = useState<BrowserTask | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);


  useEffect(() => {
    if (!session) return;
    getAgentAvailability()
      .then((s) => setAvailable(s.available))
      .catch(() => setAvailable(false));
  }, [session]);

  useEffect(() => stopPolling, []);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function startPolling(taskId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const t = await getTask(taskId).catch(() => null);
      if (!t) return;
      setTask(t);
      if (TERMINAL.has(t.status)) stopPolling();
    }, 2000);
  }

  async function launch() {
    const trimmed = goal.trim();
    if (trimmed.length < 8) {
      setError("Décrivez la tâche en au moins 8 caractères.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const t = await startTask(trimmed);
      setTask(t);
      startPolling(t.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du lancement");
    } finally {
      setStarting(false);
    }
  }

  async function respond(approve: boolean) {
    if (!task) return;
    try {
      await confirmTask(task.id, approve);
      startPolling(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la confirmation");
    }
  }

  async function cancel() {
    if (!task) return;
    try {
      await cancelTask(task.id);
      stopPolling();
      setTask((t) => (t ? { ...t, status: "cancelled" } : t));
    } catch {
      // ignore
    }
  }

  function reset() {
    stopPolling();
    setTask(null);
    setGoal("");
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <Link href="/chat" aria-label="Retour au chat" className="rounded-lg p-2 transition hover:bg-[var(--hover)]">
          <BackIcon />
        </Link>
        <h1 className="text-sm font-semibold">Agent Navigateur</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {available === false && (
          <p className="rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--text-secondary)]">
            L&apos;agent navigateur n&apos;est pas disponible sur ce serveur pour le moment.
          </p>
        )}

        {available && !task && (
          <div>
            <p className="mb-1.5 text-lg font-medium">Confiez une tâche web à l&apos;IA</p>
            <p className="mb-4 text-sm text-[var(--text-tertiary)]">
              Toumaï AI navigue pour vous : rechercher une information, remplir un
              formulaire, comparer des prix… Décrivez ce qu&apos;il faut faire.
            </p>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex : Va sur Wikipédia et résume-moi l'article sur le lac Tchad."
              rows={3}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={launch}
              disabled={starting || !goal.trim()}
              className="mt-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--primary)" }}
            >
              {starting ? "Lancement…" : "Lancer"}
            </button>
            {error && <p className="mt-2 text-sm text-[var(--error)]">{error}</p>}
          </div>
        )}

        {task && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-tertiary)]">Tâche</p>
                <p className="font-medium">{task.goal}</p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "var(--card)", color: "var(--text-secondary)" }}
              >
                {STATUS_LABEL[task.status] ?? task.status}
              </span>
            </div>

            {task.current_url && (
              <p className="mb-3 truncate text-xs text-[var(--text-tertiary)]">📍 {task.current_url}</p>
            )}

            <div className="space-y-2">
              {task.steps.map((s) => (
                <div key={s.index} className="rounded-xl bg-[var(--card)] p-3 text-sm">
                  <p className="text-[var(--text-secondary)]">{s.thought}</p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {s.action} — {s.detail}
                  </p>
                  {s.result && <p className="mt-1 text-xs text-[var(--text-tertiary)]">→ {s.result}</p>}
                </div>
              ))}
            </div>

            {task.status === "needs_confirmation" && task.pending_action && (
              <div className="mt-4 rounded-2xl border border-[var(--primary)]/40 bg-[var(--card)] p-4">
                <p className="mb-3 text-sm font-medium">
                  {task.pending_action.question ?? "Cette action nécessite ta confirmation."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(true)}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    style={{ background: "var(--primary)" }}
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => respond(false)}
                    className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm transition hover:bg-[var(--hover)]"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            )}

            {task.status === "done" && task.answer && (
              <div className="mt-4 rounded-2xl bg-[var(--card)] p-4 text-sm leading-relaxed">
                {task.answer}
              </div>
            )}

            {task.status === "error" && task.error && (
              <p className="mt-4 text-sm text-[var(--error)]">{task.error}</p>
            )}

            <div className="mt-5 flex gap-2">
              {!TERMINAL.has(task.status) && (
                <button
                  onClick={cancel}
                  className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm transition hover:bg-[var(--hover)]"
                >
                  Annuler la tâche
                </button>
              )}
              {TERMINAL.has(task.status) && (
                <button
                  onClick={reset}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: "var(--primary)" }}
                >
                  Nouvelle tâche
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
