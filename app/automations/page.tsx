"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import {
  cancelWhatsAppAutomation,
  getWhatsAppAutomations,
  pauseWhatsAppAutomation,
  resumeWhatsAppAutomation,
  updateWhatsAppAutomation,
  type WhatsAppAutomation,
  type WhatsAppAutomationStatus,
} from "@/lib/connectors-api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";

const FILTERS: { value: "" | WhatsAppAutomationStatus; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "pending", label: "À venir" },
  { value: "processing", label: "En cours" },
  { value: "paused", label: "Suspendues" },
  { value: "sent", label: "Terminées" },
  { value: "failed", label: "Échecs" },
];

const STATUS: Record<WhatsAppAutomationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Planifiée", color: "#b45309", bg: "rgba(245,158,11,.12)" },
  processing: { label: "En cours", color: "#2563eb", bg: "rgba(59,130,246,.12)" },
  paused: { label: "Suspendue", color: "#6b7280", bg: "rgba(107,114,128,.12)" },
  sent: { label: "Envoyée", color: "#15803d", bg: "rgba(34,197,94,.12)" },
  failed: { label: "Échec", color: "#b91c1c", bg: "rgba(239,68,68,.12)" },
  cancelled: { label: "Annulée", color: "#6b7280", bg: "rgba(107,114,128,.10)" },
};

function formatDate(value?: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Ndjamena",
  }).format(new Date(value));
}

function recurrenceLabel(task: WhatsAppAutomation) {
  const labels = {
    none: "Une seule fois",
    daily: "Tous les jours",
    weekly: "Chaque semaine",
    monthly: "Chaque mois",
    cron: "Récurrence personnalisée",
  };
  return labels[task.recurrence];
}

export default function AutomationsPage() {
  const { session, loading } = useAuth();
  useExigerCompte();
  const [tasks, setTasks] = useState<WhatsAppAutomation[]>([]);
  const [filter, setFilter] = useState<"" | WhatsAppAutomationStatus>("");
  const [query, setQuery] = useState("");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [editing, setEditing] = useState<WhatsAppAutomation | null>(null);
  const [cancelling, setCancelling] = useState<WhatsAppAutomation | null>(null);
  const [menuId, setMenuId] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!session) return;
    if (!quiet) setFetching(true);
    setError("");
    try {
      const result = await getWhatsAppAutomations({
        status: filter || undefined,
        limit: 100,
      });
      setTasks(result.tasks);
    } catch {
      setError("Impossible de charger les automatisations pour le moment.");
    } finally {
      if (!quiet) setFetching(false);
    }
  }, [filter, session]);

  useEffect(() => {
    if (!loading && session) void load();
  }, [load, loading, session]);

  useEffect(() => {
    if (!session || !tasks.some((task) => ["pending", "processing"].includes(task.status))) return;
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load, session, tasks]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return tasks;
    return tasks.filter((task) =>
      [task.title, task.recipient, task.message_preview, task.filename]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("fr").includes(normalized)),
    );
  }, [query, tasks]);

  const mutate = async (
    task: WhatsAppAutomation,
    action: () => Promise<WhatsAppAutomation>,
  ) => {
    setBusyId(task.id);
    setMenuId("");
    setError("");
    try {
      const updated = await action();
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError("L'action n'a pas été appliquée. Actualisez puis réessayez.");
    } finally {
      setBusyId("");
    }
  };

  if (loading || (!session && fetching)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-neutral-500" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className={`${cxScopeClass} min-h-dvh`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-2 text-sm text-[var(--cx-text-faint)]">
          <Link href="/chat" className="rounded-full p-2 transition hover:bg-[var(--cx-hover)]" aria-label="Retour au chat">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Link>
          <span>Toumaï AI</span><span>/</span>
          <span className="text-[var(--cx-text-secondary)]">Automatisations</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-8 md:px-8">
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cx-border-default)] bg-white shadow-sm">
              <WhatsAppIcon size={25} />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[var(--cx-accent-text)]">
              Toumaï Automations
            </p>
            <h1 className="max-w-2xl text-3xl font-medium tracking-[-.025em] text-[var(--cx-text-primary)] sm:text-4xl" style={cxDisplayStyle}>
              Vos tâches WhatsApp, maîtrisées de bout en bout.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cx-text-muted)]">
              Consultez ce qui doit partir, suspendez une tâche ou corrigez son heure. Toumaï ne présente jamais une programmation comme un envoi réussi.
            </p>
          </div>
          <Link href="/chat?automation=whatsapp" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cx-accent)] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(232,104,58,.22)] transition hover:brightness-105">
            <CalendarClock className="h-4 w-4" />
            Créer dans le chat
          </Link>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="À venir" value={tasks.filter((t) => t.status === "pending").length} icon={<CalendarClock />} />
          <Metric label="En cours" value={tasks.filter((t) => t.status === "processing").length} icon={<RefreshCw />} />
          <Metric label="Envoyées" value={tasks.filter((t) => t.status === "sent").length} icon={<CheckCircle2 />} />
          <Metric label="À vérifier" value={tasks.filter((t) => t.status === "failed").length} icon={<CircleAlert />} />
        </section>

        <section className="mt-6 overflow-visible rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--cx-border-subtle)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
              {FILTERS.map((item) => (
                <button key={item.value || "all"} onClick={() => setFilter(item.value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item.value ? "bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]" : "text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 lg:w-64">
                <Search className="h-4 w-4 shrink-0 text-[var(--cx-text-faint)]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cx-text-primary)] outline-none placeholder:text-[var(--cx-text-faint)]" />
              </label>
              <button onClick={() => void load()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cx-border-default)] text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]" aria-label="Actualiser">
                <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {fetching && !tasks.length ? (
            <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-[var(--cx-text-faint)]" /></div>
          ) : !visible.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <CalendarClock className="h-8 w-8 text-[var(--cx-text-faint)]" />
              <h2 className="mt-4 text-base font-semibold text-[var(--cx-text-primary)]">Aucune automatisation ici</h2>
              <p className="mt-1 max-w-md text-sm text-[var(--cx-text-muted)]">Demandez à Toumaï de programmer un message ou un fichier WhatsApp. La tâche apparaîtra ici après confirmation.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--cx-border-subtle)]">
              {visible.map((task) => (
                <TaskRow key={task.id} task={task} busy={busyId === task.id} menuOpen={menuId === task.id} onMenu={() => setMenuId((id) => id === task.id ? "" : task.id)} onPause={() => void mutate(task, () => pauseWhatsAppAutomation(task.id))} onResume={() => void mutate(task, () => resumeWhatsAppAutomation(task.id))} onEdit={() => { setMenuId(""); setEditing(task); }} onCancel={() => { setMenuId(""); setCancelling(task); }} />
              ))}
            </div>
          )}
        </section>
      </main>

      {editing && <EditDialog task={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setTasks((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditing(null); }} />}
      {cancelling && <ConfirmDialog task={cancelling} busy={busyId === cancelling.id} onClose={() => setCancelling(null)} onConfirm={() => void mutate(cancelling, () => cancelWhatsAppAutomation(cancelling.id)).then(() => setCancelling(null))} />}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-4"><span className="text-[var(--cx-accent-text)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><p className="mt-4 text-2xl font-semibold tabular-nums text-[var(--cx-text-primary)]">{value}</p><p className="mt-1 text-xs text-[var(--cx-text-muted)]">{label}</p></div>;
}

function TaskRow({ task, busy, menuOpen, onMenu, onPause, onResume, onEdit, onCancel }: { task: WhatsAppAutomation; busy: boolean; menuOpen: boolean; onMenu: () => void; onPause: () => void; onResume: () => void; onEdit: () => void; onCancel: () => void }) {
  const state = STATUS[task.status];
  const mutable = task.status === "pending" || task.status === "paused";
  return (
    <article className="relative grid gap-4 p-4 transition hover:bg-[var(--cx-hover-row)] sm:grid-cols-[auto_1fr_auto] sm:items-center md:p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]">{task.action_type === "send_media" ? <FileText className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold text-[var(--cx-text-primary)]">{task.title}</h2><span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: state.color, background: state.bg }}>{busy ? "Mise à jour…" : state.label}</span></div>
        <p className="mt-1 truncate text-sm text-[var(--cx-text-muted)]">{task.recipient}{task.message_preview ? ` — ${task.message_preview}` : ""}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--cx-text-faint)]"><span>{formatDate(task.send_at)}</span><span>{recurrenceLabel(task)}</span>{task.attempts > 0 && <span>{task.attempts} tentative{task.attempts > 1 ? "s" : ""}</span>}</div>
        {task.last_error && <p className="mt-2 line-clamp-2 text-xs text-red-600">{task.last_error}</p>}
      </div>
      <div className="flex items-center justify-end gap-2">
        {task.status === "pending" && <button disabled={busy} onClick={onPause} className="rounded-lg border border-[var(--cx-border-default)] p-2 text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)] disabled:opacity-50" aria-label="Suspendre"><Pause className="h-4 w-4" /></button>}
        {task.status === "paused" && <button disabled={busy} onClick={onResume} className="rounded-lg border border-[var(--cx-border-default)] p-2 text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)] disabled:opacity-50" aria-label="Reprendre"><Play className="h-4 w-4" /></button>}
        {mutable && <button disabled={busy} onClick={onMenu} className="rounded-lg p-2 text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]" aria-label="Plus d'actions"><MoreHorizontal className="h-5 w-5" /></button>}
      </div>
      {menuOpen && <div className="absolute right-4 top-14 z-20 w-48 rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] p-1.5 shadow-xl"><button onClick={onEdit} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--cx-text-secondary)] hover:bg-[var(--cx-hover)]"><CalendarClock className="h-4 w-4" />Modifier</button><button onClick={onCancel} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Annuler la tâche</button></div>}
    </article>
  );
}

function EditDialog({ task, onClose, onSaved }: { task: WhatsAppAutomation; onClose: () => void; onSaved: (task: WhatsAppAutomation) => void }) {
  const local = new Date(task.send_at);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  const [date, setDate] = useState(local.toISOString().slice(0, 16));
  const [message, setMessage] = useState(task.message_preview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true); setError("");
    try {
      const updated = await updateWhatsAppAutomation(task.id, {
        send_at: new Date(date).toISOString(),
        ...(task.action_type === "send_text" ? { message } : {}),
      });
      onSaved(updated);
    } catch { setError("Modification impossible. Vérifiez la date et réessayez."); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="w-full max-w-lg rounded-t-2xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] p-5 shadow-2xl sm:rounded-2xl"><div className="flex items-center justify-between"><h2 id="edit-title" className="text-lg font-semibold text-[var(--cx-text-primary)]">Modifier l’automatisation</h2><button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--cx-hover)]" aria-label="Fermer"><X className="h-4 w-4" /></button></div><p className="mt-1 text-sm text-[var(--cx-text-muted)]">{task.recipient}</p><label className="mt-5 block text-xs font-semibold text-[var(--cx-text-secondary)]">Date et heure<input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 text-sm outline-none focus:border-[var(--cx-accent)]" /></label>{task.action_type === "send_text" && <label className="mt-4 block text-xs font-semibold text-[var(--cx-text-secondary)]">Message<textarea value={message} maxLength={4096} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] p-3 text-sm outline-none focus:border-[var(--cx-accent)]" /></label>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]">Fermer</button><button disabled={saving || !date || (task.action_type === "send_text" && !message.trim())} onClick={() => void save()} className="rounded-xl bg-[var(--cx-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></div></div>;
}

function ConfirmDialog({ task, busy, onClose, onConfirm }: { task: WhatsAppAutomation; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="cancel-title"><div className="w-full max-w-md rounded-t-2xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] p-5 shadow-2xl sm:rounded-2xl"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></span><h2 id="cancel-title" className="mt-4 text-lg font-semibold text-[var(--cx-text-primary)]">Annuler définitivement ?</h2><p className="mt-2 text-sm leading-6 text-[var(--cx-text-muted)]">Le contenu ne sera pas envoyé à {task.recipient}. Une tâche déjà partie ne peut pas être rappelée.</p><div className="mt-6 flex justify-end gap-2"><button disabled={busy} onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]">Conserver</button><button disabled={busy} onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Annulation…" : "Annuler la tâche"}</button></div></div></div>;
}
