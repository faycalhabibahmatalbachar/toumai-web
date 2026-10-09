"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  Clock3,
  History,
  Loader2,
  Pause,
  Pencil,
  Play,
  Search,
  Send,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/errors";
import { whatsappHistoryEntryDetail, whatsappUiCopy, whatsappUiError } from "@/lib/whatsapp-ui-copy";
import { cacheSeed, useCached } from "@/lib/swr-cache";
import { WA_CACHE } from "@/lib/whatsapp-cache";
import {
  cancelWhatsAppAutomation,
  getWhatsAppAutomationHistory,
  getWhatsAppAutomations,
  pauseWhatsAppAutomation,
  resumeWhatsAppAutomation,
  updateWhatsAppAutomation,
  type WhatsAppAutomation,
  type WhatsAppAutomationHistoryEntry,
  type WhatsAppAutomationStatus,
} from "@/lib/connectors-api";

const BG = "#06111a";
const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const BLUE = "#2f8cff";
const ORANGE = "#ff9518";

type Filter = "all" | "active" | "paused" | "failed" | "done";

export default function WhatsAppAutomationsPage() {
  const { session } = useAuth();
  useExigerCompte();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<WhatsAppAutomation | null>(null);
  const [historyTask, setHistoryTask] = useState<WhatsAppAutomation | null>(null);
  const [history, setHistory] = useState<WhatsAppAutomationHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const {
    data: tasksData,
    loading,
    error: cacheError,
    refresh: load,
  } = useCached<{ tasks: WhatsAppAutomation[]; count: number }>(
    WA_CACHE.automations("", 100),
    () => getWhatsAppAutomations({ limit: 100 }),
    { enabled: Boolean(session), ttlMs: 5_000, refreshIntervalMs: 30_000 },
  );
  const tasks = tasksData?.tasks ?? [];
  const error = whatsappUiCopy(actionError || cacheError, "");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filter === "active" && !["pending", "processing"].includes(task.status)) return false;
      if (filter === "paused" && task.status !== "paused") return false;
      if (filter === "failed" && task.status !== "failed") return false;
      if (filter === "done" && !["sent", "cancelled"].includes(task.status)) return false;
      if (!term) return true;
      return (
        task.title.toLowerCase().includes(term) ||
        task.recipient.toLowerCase().includes(term) ||
        task.message_preview.toLowerCase().includes(term)
      );
    });
  }, [tasks, filter, query]);

  const counts = useMemo(() => ({
    active: tasks.filter((task) => ["pending", "processing"].includes(task.status)).length,
    paused: tasks.filter((task) => task.status === "paused").length,
    failed: tasks.filter((task) => task.status === "failed").length,
  }), [tasks]);

  async function runAction(task: WhatsAppAutomation, action: "pause" | "resume" | "cancel") {
    if (busy[task.id]) return;
    if (action === "cancel" && !window.confirm(`Annuler définitivement « ${task.title} » ?`)) return;
    setBusy((current) => ({ ...current, [task.id]: true }));
    setActionError(null);
    try {
      if (action === "pause") await pauseWhatsAppAutomation(task.id);
      else if (action === "resume") await resumeWhatsAppAutomation(task.id);
      else await cancelWhatsAppAutomation(task.id);
      await load();
    } catch (exc) {
      setActionError(whatsappUiError(exc));
    } finally {
      setBusy((current) => ({ ...current, [task.id]: false }));
    }
  }

  async function openHistory(task: WhatsAppAutomation) {
    setHistoryTask(task);
    const cached = cacheSeed<{ entries: WhatsAppAutomationHistoryEntry[]; count: number }>(
      WA_CACHE.automationHistory(task.id, 50),
    );
    setHistory(cached?.entries ?? []);
    setHistoryLoading(false);
    try {
      const data = await getWhatsAppAutomationHistory(task.id, 50);
      setHistory(data.entries);
    } catch {
      if (!cached) setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: BG, color: TEXT }}>
      <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(6,17,26,.96)", borderColor: BORDER, backdropFilter: "blur(16px)" }}>
        <div className="mx-auto flex h-[70px] max-w-[1480px] items-center gap-3 px-4 md:px-7">
          <Link href="/whatsapp" aria-label="Retour à WhatsApp Overview" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5" style={{ color: MUTED }}>
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08b963]"><WhatsAppIcon size={24} /></div>
          <div>
            <h1 className="text-[16px] font-semibold">Automatisations WhatsApp</h1>
            <p className="text-[11px]" style={{ color: MUTED }}>Gérez vos envois programmés.</p>
          </div>
          <Link href="/chat" className="ml-auto flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white" style={{ background: GREEN }}>
            <Send size={16} /> <span className="hidden sm:inline">Créer via Toumaï</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-6 md:px-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Actives" value={counts.active} icon={<Workflow size={20} />} color={GREEN} />
          <StatCard label="En pause" value={counts.paused} icon={<Pause size={20} />} color={ORANGE} />
          <StatCard label="Échecs" value={counts.failed} icon={<CircleAlert size={20} />} color="#ff6b6b" />
        </div>

        <section className="mt-4 overflow-hidden rounded-[16px] border" style={{ borderColor: BORDER, background: SURFACE }}>
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center" style={{ borderColor: BORDER }}>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-3" size={17} color={MUTED} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher par nom, destinataire ou message"
                className="h-10 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-[#2f8cff]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: RAISED }}>
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" />
              <FilterButton active={filter === "active"} onClick={() => setFilter("active")} label="Actives" />
              <FilterButton active={filter === "paused"} onClick={() => setFilter("paused")} label="Pause" />
              <FilterButton active={filter === "failed"} onClick={() => setFilter("failed")} label="Échecs" />
              <FilterButton active={filter === "done"} onClick={() => setFilter("done")} label="Terminées" />
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && <div className="space-y-2 p-4">{[0, 1, 2, 3].map((index) => <div key={index} className="h-[82px] animate-pulse rounded-xl bg-white/[0.025]" />)}</div>}

          {!loading && filtered.length === 0 && (
            <div className="px-6 py-14 text-center">
              <Workflow className="mx-auto" size={26} color={MUTED} />
              <p className="mt-3 text-sm font-semibold">Aucune automatisation</p>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>La création reste dans le chat Toumaï afin de résoudre le destinataire et demander votre confirmation avant de programmer un envoi.</p>
              <Link href="/chat" className="mt-4 inline-flex h-10 items-center rounded-xl px-4 text-xs font-semibold text-white" style={{ background: GREEN }}>Créer une automatisation</Link>
            </div>
          )}

          {!loading && filtered.map((task) => (
            <AutomationRow
              key={task.id}
              task={task}
              busy={Boolean(busy[task.id])}
              onPause={() => void runAction(task, "pause")}
              onResume={() => void runAction(task, "resume")}
              onCancel={() => void runAction(task, "cancel")}
              onEdit={() => setEditTask(task)}
              onHistory={() => void openHistory(task)}
            />
          ))}
        </section>
      </main>

      {editTask && (
        <EditAutomationModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={async () => {
            setEditTask(null);
            await load();
          }}
        />
      )}

      {historyTask && (
        <HistoryModal
          task={historyTask}
          entries={history}
          loading={historyLoading}
          onClose={() => setHistoryTask(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex min-h-[96px] items-center gap-3 rounded-[14px] border p-4" style={{ borderColor: BORDER, background: SURFACE }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `${color}18`, color }}>{icon}</div>
      <div><p className="text-[11px]" style={{ color: MUTED }}>{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="rounded-lg px-3 py-2 text-[11px] font-semibold" style={{ background: active ? SURFACE : "transparent", color: active ? TEXT : MUTED }}>{label}</button>;
}

function AutomationRow({
  task,
  busy,
  onPause,
  onResume,
  onCancel,
  onEdit,
  onHistory,
}: {
  task: WhatsAppAutomation;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const active = ["pending", "processing"].includes(task.status);
  const editable = ["pending", "paused"].includes(task.status);
  return (
    <div className="grid gap-4 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(220px,1.25fr)_minmax(180px,.9fr)_minmax(170px,.8fr)_auto] lg:items-center" style={{ borderColor: BORDER }}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#083b2a]" style={{ color: GREEN }}><Workflow size={18} /></div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{task.title}</p>
          <p className="mt-1 truncate text-[11px]" style={{ color: MUTED }}>{task.message_preview || "Message WhatsApp"}</p>
          <StatusBadge status={task.status} />
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: MUTED }}>Destinataire</p>
        <p className="mt-1 truncate text-xs">{task.recipient}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: MUTED }}>Planification</p>
        <p className="mt-1 text-xs">{formatSchedule(task)}</p>
      </div>
      <div className="flex flex-wrap justify-start gap-1 lg:justify-end">
        {busy ? (
          <span className="flex h-9 w-9 items-center justify-center"><Loader2 size={16} className="animate-spin" /></span>
        ) : (
          <>
            {active && <IconButton label="Mettre en pause" onClick={onPause}><Pause size={16} /></IconButton>}
            {task.status === "paused" && <IconButton label="Reprendre" onClick={onResume}><Play size={16} /></IconButton>}
            {editable && <IconButton label="Modifier" onClick={onEdit}><Pencil size={16} /></IconButton>}
            <IconButton label="Historique" onClick={onHistory}><History size={16} /></IconButton>
            {editable && <IconButton label="Annuler" onClick={onCancel} danger><Trash2 size={16} /></IconButton>}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WhatsAppAutomationStatus }) {
  const map: Record<WhatsAppAutomationStatus, { label: string; color: string }> = {
    pending: { label: "Planifiée", color: BLUE },
    processing: { label: "En cours", color: GREEN },
    paused: { label: "En pause", color: ORANGE },
    sent: { label: "Envoyée", color: GREEN },
    failed: { label: "Échec", color: "#ff6b6b" },
    cancelled: { label: "Annulée", color: MUTED },
  };
  const item = map[status];
  return <span className="mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-semibold" style={{ color: item.color, background: `${item.color}16` }}>{item.label}</span>;
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-white/5" style={{ borderColor: BORDER, color: danger ? "#ff6b6b" : MUTED }}>
      {children}
    </button>
  );
}

function EditAutomationModal({ task, onClose, onSaved }: { task: WhatsAppAutomation; onClose: () => void; onSaved: () => Promise<void> }) {
  const [message, setMessage] = useState(task.message_preview || "");
  const [recurrence, setRecurrence] = useState<WhatsAppAutomation["recurrence"]>(task.recurrence);
  const [cron, setCron] = useState(task.cron_expr || "");
  const [sendAt, setSendAt] = useState(toLocalInput(task.send_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving || !message.trim() || !sendAt) return;
    setSaving(true);
    setError(null);
    try {
      const iso = new Date(sendAt).toISOString();
      await updateWhatsAppAutomation(task.id, {
        message: message.trim(),
        send_at: iso,
        recurrence,
        cron_expr: recurrence === "cron" ? cron.trim() : "",
      });
      await onSaved();
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Modifier l’automatisation" onClose={onClose}>
      <div className="space-y-4 p-5">
        <Field label="Message">
          <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 4096))} rows={5} className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#2f8cff]" style={{ background: RAISED, borderColor: BORDER }} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prochain envoi">
            <input type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} className="h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-[#2f8cff]" style={{ background: RAISED, borderColor: BORDER }} />
          </Field>
          <Field label="Récurrence">
            <select value={recurrence} onChange={(event) => setRecurrence(event.target.value as WhatsAppAutomation["recurrence"])} className="h-10 w-full rounded-xl border px-3 text-sm outline-none" style={{ background: RAISED, borderColor: BORDER }}>
              <option value="none">Une fois</option><option value="daily">Chaque jour</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="cron">Personnalisée</option>
            </select>
          </Field>
        </div>
        {recurrence === "cron" && <Field label="Planification avancée"><input value={cron} onChange={(event) => setCron(event.target.value)} placeholder="0 8 * * 1-5" className="h-10 w-full rounded-xl border px-3 text-sm outline-none" style={{ background: RAISED, borderColor: BORDER }} /></Field>}
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border px-4 text-xs font-semibold" style={{ borderColor: BORDER }}>Annuler</button>
          <button type="button" onClick={() => void save()} disabled={saving || !message.trim() || !sendAt} className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-50" style={{ background: GREEN }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />} Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryModal({ task, entries, loading, onClose }: { task: WhatsAppAutomation; entries: WhatsAppAutomationHistoryEntry[]; loading: boolean; onClose: () => void }) {
  return (
    <Modal title={`Historique · ${task.title}`} onClose={onClose}>
      <div className="max-h-[62vh] overflow-y-auto p-5">
        {loading && entries.length === 0 && <div className="py-6" role="status" aria-label="Mise à jour de l’historique" />}
        {!loading && entries.length === 0 && <p className="py-10 text-center text-sm" style={{ color: MUTED }}>Aucune activité enregistrée.</p>}
        {entries.map((entry, index) => (
          <div key={`${entry.created_at}-${index}`} className="flex gap-3 border-b py-3 last:border-b-0" style={{ borderColor: BORDER }}>
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.success ? GREEN : "#ff6b6b" }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{entry.action}</p>
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{whatsappHistoryEntryDetail(entry)}</p>
              <time className="mt-1 block text-[9px]" style={{ color: MUTED }}>{formatDate(entry.created_at)}</time>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" />
      <section role="dialog" aria-modal="true" className="relative z-10 w-full max-w-[620px] overflow-hidden rounded-[20px] border shadow-2xl" style={{ background: SURFACE, borderColor: BORDER }}>
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}><h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2><button type="button" aria-label="Fermer" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5" style={{ color: MUTED }}><X size={18} /></button></header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-semibold" style={{ color: MUTED }}>{label}</span>{children}</label>;
}

function formatSchedule(task: WhatsAppAutomation) {
  const date = formatDate(task.send_at);
  const labels: Record<string, string> = { none: "une fois", daily: "quotidien", weekly: "hebdomadaire", monthly: "mensuel", cron: "personnalisée" };
  return `${date} · ${labels[task.recurrence] || task.recurrence}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toLocalInput(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
