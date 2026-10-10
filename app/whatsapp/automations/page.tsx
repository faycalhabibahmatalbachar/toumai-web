"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

import { whatsappHistoryEntryDetail, whatsappUiCopy, whatsappUiError } from "@/lib/whatsapp-ui-copy";
import { cacheSeed, useCached } from "@/lib/swr-cache";
import { WA_CACHE } from "@/lib/whatsapp-cache";
import { createWhatsAppTextAutomation, newRequestId } from "@/lib/automations-api";
import {
  cancelWhatsAppAutomation,
  getWhatsAppAutomationHistory,
  getWhatsAppAutomationDetail,
  getWhatsAppAutomationStats,
  getWhatsAppAutomationsPage,
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
const PAGE_SIZE = 25;

export default function WhatsAppAutomationsPage() {
  const { session } = useAuth();
  useExigerCompte();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => { setServerSearch(query.trim()); setOffset(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<WhatsAppAutomation | null>(null);
  const [historyTask, setHistoryTask] = useState<WhatsAppAutomation | null>(null);
  const [history, setHistory] = useState<WhatsAppAutomationHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const {
    data: tasksData,
    fromCache,
    loading,
    error: cacheError,
    refresh: load,
  } = useCached<{ tasks: WhatsAppAutomation[]; count: number; offset: number; limit: number }>(
    WA_CACHE.automationsPage(filter, serverSearch, offset, PAGE_SIZE),
    () => getWhatsAppAutomationsPage(
      { status: filter, search: serverSearch, offset, limit: PAGE_SIZE },
      { revalidate: true },
    ),
    { enabled: Boolean(session), ttlMs: 5_000, refreshIntervalMs: 30_000 },
  );
  const {
    data: stats,
    fromCache: statsFromCache,
    error: statsError,
    refresh: refreshStats,
  } = useCached(
    WA_CACHE.automationStats,
    () => getWhatsAppAutomationStats({ revalidate: true }),
    { enabled: Boolean(session), ttlMs: 5_000, refreshIntervalMs: 30_000 },
  );
  const tasks = tasksData?.tasks ?? [];
  const total = tasksData?.count ?? 0;
  const error = whatsappUiCopy(actionError || cacheError, "");
  const counts = stats?.by_status;
  const exactCounts = statsError ? null : counts;
  const active = exactCounts ? (exactCounts.pending ?? 0) + (exactCounts.processing ?? 0) : null;
  const selectFilter = (next: Filter) => { setFilter(next); setOffset(0); };

  async function runAction(task: WhatsAppAutomation, action: "pause" | "resume" | "cancel") {
    if (busy[task.id]) return;
    if (action === "cancel" && !window.confirm(`Annuler définitivement « ${task.title} » ?`)) return;
    setBusy((current) => ({ ...current, [task.id]: true }));
    setActionError(null);
    try {
      if (action === "pause") await pauseWhatsAppAutomation(task.id);
      else if (action === "resume") await resumeWhatsAppAutomation(task.id);
      else await cancelWhatsAppAutomation(task.id);
      await Promise.all([load(), refreshStats()]);
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
    setHistoryLoading(!cached);
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
        <div className="mx-auto flex h-[70px] max-w-[1480px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-7">
          <Link href="/whatsapp" aria-label="Retour à WhatsApp Overview" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5" style={{ color: MUTED }}>
            <ArrowLeft size={19} />
          </Link>
          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#08b963] sm:flex"><WhatsAppIcon size={24} /></div>
          <div className="min-w-0 flex-1 lg:flex-none">
            <h1 className="truncate text-[13px] font-semibold sm:text-[16px]">Automatisations WhatsApp</h1>
            <p className="hidden text-[11px] sm:block" style={{ color: MUTED }}>Gérez vos envois programmés.</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold sm:px-3" style={{ borderColor: BORDER, color: TEXT }}><CalendarClock size={16} /> <span className="hidden sm:inline">Nouvelle automatisation</span><span className="sm:hidden">Créer</span></button>
          <Link href="/automations" className="hidden shrink-0 rounded-xl border px-3 py-2 text-xs lg:inline-flex" style={{ borderColor: BORDER, color: MUTED }}>Workflows V2</Link>
          <Link href="/chat" className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-white sm:px-4" style={{ background: GREEN }}>
            <Send size={16} /> <span className="hidden sm:inline">Créer via Toumaï</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-6 md:px-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Actives" value={active ?? "—"} icon={<Workflow size={20} />} color={GREEN} />
          <StatCard label="En pause" value={exactCounts?.paused ?? "—"} icon={<Pause size={20} />} color={ORANGE} />
          <StatCard label="Échecs" value={exactCounts?.failed ?? "—"} icon={<CircleAlert size={20} />} color="#ff6b6b" />
        </div>

        <p className="mt-3 text-xs" style={{ color: MUTED }}>Envois programmés historiques seulement · {stats ? `${stats.total} au total` : "Total indisponible"}{(fromCache || statsFromCache) ? " · Données mises en cache" : ""}. Les workflows du moteur V2 sont accessibles séparément.</p>
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
              <FilterButton active={filter === "all"} onClick={() => selectFilter("all")} label="Toutes" />
              <FilterButton active={filter === "active"} onClick={() => selectFilter("active")} label="Actives" />
              <FilterButton active={filter === "paused"} onClick={() => selectFilter("paused")} label="Pause" />
              <FilterButton active={filter === "failed"} onClick={() => selectFilter("failed")} label="Échecs" />
              <FilterButton active={filter === "done"} onClick={() => selectFilter("done")} label="Terminées" />
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && <div className="space-y-2 p-4">{[0, 1, 2, 3].map((index) => <div key={index} className="h-[82px] animate-pulse rounded-xl bg-white/[0.025]" />)}</div>}

          {!loading && !error && tasks.length === 0 && (
            <div className="px-6 py-14 text-center">
              <Workflow className="mx-auto" size={26} color={MUTED} />
              <p className="mt-3 text-sm font-semibold">Aucune automatisation</p>
              <p className="mt-1 text-xs" style={{ color: MUTED }}>Créez un envoi texte depuis cette page, ou utilisez Toumaï pour les scénarios avancés.</p>
              <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 inline-flex h-10 items-center rounded-xl px-4 text-xs font-semibold text-white" style={{ background: GREEN }}>Nouvelle automatisation texte</button>
            </div>
          )}

          {!loading && tasks.map((task) => (
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs" style={{ borderColor: BORDER, color: MUTED }}>
            <span>{tasksData ? `${Math.min(offset + 1, total)}–${Math.min(offset + tasks.length, total)} sur ${total} résultats` : "Résultats indisponibles"}</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={offset === 0 || loading} onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))} className="rounded-lg border px-3 py-2 disabled:opacity-40" style={{ borderColor: BORDER }}>Précédent</button>
              <button type="button" disabled={loading || offset + PAGE_SIZE >= total} onClick={() => setOffset((p) => p + PAGE_SIZE)} className="rounded-lg border px-3 py-2 disabled:opacity-40" style={{ borderColor: BORDER }}>Suivant</button>
            </div>
          </div>
        </section>
      </main>

      {createOpen && <CreateTextAutomationModal onClose={() => setCreateOpen(false)} />}

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

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
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
  // Backend authorizes these state changes only from pending. Never show
  // buttons that deterministically respond 409 for processing/paused tasks.
  const canPause = task.status === "pending";
  const editable = task.status === "pending";
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
            {canPause && <IconButton label="Mettre en pause" onClick={onPause}><Pause size={16} /></IconButton>}
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
  // The listing only contains a 160-character preview. Editing MUST load the
  // complete owner-scoped body, otherwise changing a date truncates messages.
  const [message, setMessage] = useState("");
  const [originalMessage, setOriginalMessage] = useState<string | null>(null);
  const [detailReady, setDetailReady] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);
  const [recurrence, setRecurrence] = useState<WhatsAppAutomation["recurrence"]>(task.recurrence);
  const [cron, setCron] = useState(task.cron_expr || "");
  const [sendAt, setSendAt] = useState(toLocalInput(task.send_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isText = task.action_type === "send_text";

  useEffect(() => {
    let active = true;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const loadDetail = async () => {
      try {
        const detail = await Promise.race([
          getWhatsAppAutomationDetail(task.id),
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => reject(new Error("La lecture du message a dépassé 12 secondes.")), 12_000);
          }),
        ]);
        if (!active) return;
        if (detail.id !== task.id || detail.status !== "pending") {
          throw new Error("Cette automatisation n'est plus modifiable. Actualisez la liste.");
        }
        if (isText && typeof detail.message_full !== "string") {
          throw new Error("Le contenu complet du message n'est pas disponible. La modification est bloquée.");
        }
        const full = detail.message_full ?? "";
        setOriginalMessage(full);
        setMessage(full);
        setDetailReady(true);
      } catch (exc) {
        if (active) setError(whatsappUiError(exc, "generic"));
      } finally {
        if (deadline) clearTimeout(deadline);
        if (active) setDetailLoading(false);
      }
    };
    void loadDetail();
    return () => { active = false; if (deadline) clearTimeout(deadline); };
  }, [task.id, isText]);

  const canSave = detailReady && !detailLoading && !saving && Boolean(sendAt) && (!isText || Boolean(message.trim()));

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const date = new Date(sendAt);
      if (Number.isNaN(date.getTime())) throw new Error("Date de planification invalide.");
      const patch: {
        message?: string; send_at: string;
        recurrence: WhatsAppAutomation["recurrence"]; cron_expr: string;
      } = {
        send_at: date.toISOString(),
        recurrence,
        cron_expr: recurrence === "cron" ? cron.trim() : "",
      };
      // Preserve the full original body byte-for-byte when editing only
      // schedule or recurrence. Never PATCH a list preview.
      if (isText && originalMessage !== null && message !== originalMessage) {
        patch.message = message.trim();
      }
      await updateWhatsAppAutomation(task.id, patch);
      await onSaved();
    } catch (exc) {
      setError(whatsappUiError(exc, "generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Modifier l’automatisation" onClose={onClose}>
      <div className="space-y-4 p-5">
        {detailLoading && <p role="status" className="text-xs" style={{ color: MUTED }}>Chargement du contenu complet et vérification des droits…</p>}
        {isText && (
          <Field label="Message complet">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 4096))}
              rows={5}
              disabled={!detailReady || saving}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60 focus:border-[#2f8cff]"
              style={{ background: RAISED, borderColor: BORDER }}
            />
          </Field>
        )}
        {!isText && <p className="text-xs" style={{ color: MUTED }}>Média existant : vous pouvez modifier uniquement son horaire et sa récurrence. Le fichier et sa légende sont préservés.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prochain envoi">
            <input disabled={!detailReady || saving} type="datetime-local" value={sendAt} onChange={(event) => setSendAt(event.target.value)} className="h-10 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60 focus:border-[#2f8cff]" style={{ background: RAISED, borderColor: BORDER }} />
          </Field>
          <Field label="Récurrence">
            <select disabled={!detailReady || saving} value={recurrence} onChange={(event) => setRecurrence(event.target.value as WhatsAppAutomation["recurrence"])} className="h-10 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60" style={{ background: RAISED, borderColor: BORDER }}>
              <option value="none">Une fois</option><option value="daily">Chaque jour</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="cron">Personnalisée</option>
            </select>
          </Field>
        </div>
        {recurrence === "cron" && <Field label="Planification avancée"><input disabled={!detailReady || saving} value={cron} onChange={(event) => setCron(event.target.value)} placeholder="0 8 * * 1-5" className="h-10 w-full rounded-xl border px-3 text-sm outline-none disabled:opacity-60" style={{ background: RAISED, borderColor: BORDER }} /></Field>}
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl border px-4 text-xs font-semibold" style={{ borderColor: BORDER }}>Annuler</button>
          <button type="button" onClick={() => void save()} disabled={!canSave} className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-50" style={{ background: GREEN }}>
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
        {loading && entries.length === 0 && <div className="h-20" role="status" aria-label="Actualisation en cours" />}
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


function CreateTextAutomationModal({ onClose }: { onClose: () => void }) {
  const [recipient, setRecipient] = useState("");
  const [title, setTitle] = useState("Rappel WhatsApp");
  const [message, setMessage] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [locked, setLocked] = useState(false);
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");

  function localDateIsValid(value: string, date: Date): boolean {
    if (Number.isNaN(date.getTime())) return false;
    const two = (n: number) => String(n).padStart(2, "0");
    const roundTrip = [
      date.getFullYear(), "-", two(date.getMonth() + 1),
      "-", two(date.getDate()), "T", two(date.getHours()),
      ":", two(date.getMinutes()),
    ].join("");
    return roundTrip === value.slice(0, 16);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !confirmed) return;
    setError("");
    const date = new Date(sendAt);
    if (!sendAt || !localDateIsValid(sendAt, date) || date.getTime() <= Date.now() + 60_000) {
      setError("Choisissez une date future valide dans votre fuseau horaire.");
      return;
    }
    if (!recipient.trim() || !message.trim()) {
      setError("Le destinataire et le message sont obligatoires.");
      return;
    }
    if (!requestId.current) requestId.current = newRequestId("wa-web");
    setLocked(true);
    setBusy(true);
    try {
      const result = await createWhatsAppTextAutomation({
        to: recipient.trim(),
        message: message.trim(),
        name: title.trim() || "Rappel WhatsApp",
        at: date.toISOString(),
        timezone,
        requestId: requestId.current,
      });
      if (!result.automation?.id) throw new Error("La création n'a pas retourné de référence.");
      // Created automations belong to V2, not the legacy scheduled-message list.
      router.push("/automations?id=" + encodeURIComponent(result.automation.id));
    } catch (exc) {
      setError(whatsappUiError(exc) + " Vérifiez les workflows V2 avant de créer une autre tâche.");
    } finally {
      setBusy(false);
    }
  }

  const setAndUnconfirm = (setter: (v: string) => void, value: string) => {
    setter(value);
    setConfirmed(false);
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3">
      <section role="dialog" aria-modal="true" aria-labelledby="wa-create-title" className="w-full max-w-lg overflow-y-auto rounded-2xl border p-5 sm:p-6" style={{ borderColor: BORDER, background: SURFACE, maxHeight: "90vh" }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="wa-create-title" className="text-lg font-semibold">Nouvelle automatisation texte</h2>
            <p className="mt-1 text-xs" style={{ color: MUTED }}>Automation OS V2 · enregistrement après confirmation</p>
          </div>
          <button type="button" aria-label="Fermer" disabled={busy} onClick={onClose} className="rounded-lg p-2 disabled:opacity-50"><X size={19} /></button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
          <label className="block text-xs">Destinataire WhatsApp
            <input required disabled={locked} value={recipient} maxLength={200} onChange={(e) => setAndUnconfirm(setRecipient, e.target.value)} placeholder="Nom exact ou numéro autorisé" className="mt-1 block h-11 w-full rounded-xl border bg-transparent px-3 text-sm disabled:opacity-60" style={{ borderColor: BORDER }} />
          </label>
          <label className="block text-xs">Titre
            <input required disabled={locked} value={title} maxLength={200} onChange={(e) => setAndUnconfirm(setTitle, e.target.value)} className="mt-1 block h-11 w-full rounded-xl border bg-transparent px-3 text-sm disabled:opacity-60" style={{ borderColor: BORDER }} />
          </label>
          <label className="block text-xs">Message
            <textarea required disabled={locked} value={message} maxLength={4096} rows={4} onChange={(e) => setAndUnconfirm(setMessage, e.target.value)} placeholder="Votre message..." className="mt-1 block w-full rounded-xl border bg-transparent px-3 py-2 text-sm disabled:opacity-60" style={{ borderColor: BORDER }} />
          </label>
          <label className="block text-xs">Date et heure de l&apos;envoi
            <input required disabled={locked} type="datetime-local" value={sendAt} onChange={(e) => setAndUnconfirm(setSendAt, e.target.value)} className="mt-1 block h-11 w-full rounded-xl border bg-transparent px-3 text-sm disabled:opacity-60" style={{ borderColor: BORDER }} />
            <span className="mt-1 block text-[11px]" style={{ color: MUTED }}>Fuseau : {timezone} · envoi unique.</span>
          </label>
          <div className="rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, background: RAISED }}>
            <p className="font-semibold">Aperçu avant activation</p>
            <p className="mt-2">À : {recipient.trim() || "Non défini"}</p>
            <p className="mt-1">Quand : {sendAt || "Non défini"} ({timezone})</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{message.trim() || "Message non défini"}</p>
            <p className="mt-2" style={{ color: MUTED }}>Aucun envoi immédiat. Le serveur vérifie le destinataire, les permissions et la planification.</p>
          </div>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>Je confirme ce destinataire, ce message, cet horaire et l&apos;autorisation de l&apos;envoyer.</span>
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: BORDER }}>Annuler</button>
            <button type="submit" disabled={busy || !confirmed} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: GREEN }}>{busy ? "Enregistrement..." : "Créer et activer"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
