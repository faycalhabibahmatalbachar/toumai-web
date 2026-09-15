"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Copy,
  History,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { HttpError } from "@/lib/errors";
import {
  activateAutomation,
  archiveAutomation,
  automationStatus,
  cancelAutomation,
  contentLabel,
  contentPreview,
  decideApproval,
  duplicateAutomation,
  errorMessage,
  formatWhen,
  getAutomation,
  inFilter,
  listApprovals,
  listAutomations,
  newRequestId,
  pauseAutomation,
  runAutomationNow,
  runStatus,
  scheduleLabel,
  updateAutomationTrigger,
  viaWhatsApp,
  type Automation,
  type AutomationApproval,
  type Filter,
  type Tone,
} from "@/lib/automations-api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";

/*
 * Toumaï Automations : client Web d'Automation OS.
 *
 * Même source (`/automations/v2`), mêmes filtres, mêmes libellés et mêmes
 * actions que l'application mobile : ce qui est créé, suspendu ou annulé d'un
 * côté apparaît de l'autre au prochain rafraîchissement (30 s ici).
 */

const FILTERS: { value: Filter; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "attention", label: "Action requise" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminées" },
  { value: "failed", label: "Échecs" },
  { value: "all", label: "Toutes" },
];

const TONES: Record<Tone, { color: string; bg: string }> = {
  neutral: { color: "#6b7280", bg: "rgba(107,114,128,.12)" },
  active: { color: "#2563eb", bg: "rgba(59,130,246,.12)" },
  attention: { color: "#b45309", bg: "rgba(245,158,11,.14)" },
  success: { color: "#15803d", bg: "rgba(34,197,94,.12)" },
  error: { color: "#b91c1c", bg: "rgba(239,68,68,.12)" },
};

function serverMessage(error: unknown, fallback: string) {
  return error instanceof HttpError && error.message ? error.message : fallback;
}

function Pill({ label, tone }: { label: string; tone: Tone }) {
  const t = TONES[tone];
  return <span className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold" style={{ color: t.color, background: t.bg }}>{label}</span>;
}

export default function AutomationsPage() {
  const { session, loading } = useAuth();
  useExigerCompte();
  const [items, setItems] = useState<Automation[]>([]);
  const [approvals, setApprovals] = useState<AutomationApproval[]>([]);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [query, setQuery] = useState("");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  const load = useCallback(async (quiet = false) => {
    if (!session) return;
    if (!quiet) setFetching(true);
    setError("");
    try {
      const [list, pending] = await Promise.all([listAutomations(), listApprovals().catch(() => [])]);
      setItems(list);
      setApprovals(pending);
    } catch {
      setError("Impossible de charger les automatisations pour le moment.");
    } finally {
      if (!quiet) setFetching(false);
    }
  }, [session]);

  // Hors du rendu de l'effet : le chargement met à jour l'état.
  useEffect(() => { if (!loading && session) void Promise.resolve().then(() => load()); }, [load, loading, session]);

  useEffect(() => {
    const sync = () => setIsOnline(window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  // Synchronisation avec le mobile et l'exécuteur : relecture régulière tant
  // que la page est visible.
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load, session]);

  const pending = useMemo(() => new Set(approvals.map((a) => a.automation_id).filter(Boolean) as string[]), [approvals]);
  const activeFilter: Filter = filter ?? (["attention", "upcoming", "failed"] as Filter[]).find((f) => items.some((a) => inFilter(a, f, pending))) ?? "all";
  const count = (f: Filter) => items.filter((a) => inFilter(a, f, pending)).length;

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return items
      .filter((a) => inFilter(a, activeFilter, pending))
      .filter((a) => !q || [a.name, a.recipient, a.original_request].filter(Boolean).some((v) => String(v).toLocaleLowerCase("fr").includes(q)))
      .sort((a, b) => {
        if (a.next_run_at && b.next_run_at) return a.next_run_at.localeCompare(b.next_run_at);
        if (a.next_run_at) return -1;
        if (b.next_run_at) return 1;
        return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
      });
  }, [items, activeFilter, pending, query]);

  if (loading || (!session && fetching)) {
    return <div className="flex min-h-dvh items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-neutral-500" aria-label="Chargement" /></div>;
  }

  return (
    <div className={`${cxScopeClass} min-h-dvh`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-2 text-sm text-[var(--cx-text-faint)]">
          <Link href="/chat" className="rounded-full p-2 transition hover:bg-[var(--cx-hover)]" aria-label="Retour au chat"><ChevronRight className="h-4 w-4 rotate-180" /></Link>
          <span>Toumaï AI</span><span>/</span><span className="text-[var(--cx-text-secondary)]">Automatisations</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-8 md:px-8">
        {!isOnline && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><WifiOff className="h-4 w-4" />Hors connexion : les actions sont désactivées.</div>}
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--cx-border-default)] bg-white shadow-sm"><WhatsAppIcon size={25} /></div>
            <h1 className="max-w-2xl text-3xl font-medium tracking-[-.025em] text-[var(--cx-text-primary)] sm:text-4xl" style={cxDisplayStyle}>Automatisations</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cx-text-muted)]">Ce qui partira, vers qui et quand, puis ce qui s’est réellement passé. Les mêmes tâches que dans l’application mobile.</p>
          </div>
          <Link href="/chat?automation=whatsapp" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cx-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-105"><CalendarClock className="h-4 w-4" />Programmer dans le chat</Link>
        </section>

        <section className="mt-8 overflow-visible rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--cx-border-subtle)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0" role="tablist">
              {FILTERS.map((f) => {
                const n = count(f.value);
                return <button key={f.value} role="tab" aria-selected={activeFilter === f.value} onClick={() => setFilter(f.value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${activeFilter === f.value ? "bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]" : "text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]"}`}>{f.label}{n > 0 && f.value !== "all" ? ` · ${n}` : ""}</button>;
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 lg:w-64">
                <Search className="h-4 w-4 shrink-0 text-[var(--cx-text-faint)]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cx-text-primary)] outline-none placeholder:text-[var(--cx-text-faint)]" />
              </label>
              <button onClick={() => void load()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cx-border-default)] text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]" aria-label="Actualiser"><RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} /></button>
            </div>
          </div>

          {error && <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => void load()} className="shrink-0 rounded-lg px-3 py-1.5 font-semibold hover:bg-red-100">Réessayer</button></div>}

          {fetching && !items.length ? (
            <div className="flex min-h-56 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-[var(--cx-text-faint)]" /></div>
          ) : !visible.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <CalendarClock className="h-8 w-8 text-[var(--cx-text-faint)]" />
              <h2 className="mt-4 text-base font-semibold text-[var(--cx-text-primary)]">Rien ici pour le moment.</h2>
              <p className="mt-1 max-w-md text-sm text-[var(--cx-text-muted)]">Écrivez dans le chat « Envoie bonjour à Ali demain à 8h ».</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--cx-border-subtle)]">
              {visible.map((a) => {
                const st = pending.has(a.id) ? { label: "Validation requise", tone: "attention" as Tone } : automationStatus(a);
                return (
                  <button key={a.id} onClick={() => setSelectedId(a.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 p-4 text-left transition hover:bg-[var(--cx-hover-row)] md:p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]"><MessageCircle className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--cx-text-primary)]">{a.name}</span>
                      <span className="mt-1 block truncate text-sm text-[var(--cx-text-muted)]">{[a.recipient, scheduleLabel(a)].filter(Boolean).join(" · ")}</span>
                      {a.last_run && ["failed", "timed_out", "ambiguous"].includes(a.last_run.status) && <span className="mt-1.5 line-clamp-1 block text-xs text-red-600">{errorMessage(a.last_run.error, a.last_run.error_category, a.last_run.status)}</span>}
                    </span>
                    <Pill {...st} />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selectedId && <DetailPanel id={selectedId} online={isOnline} approvals={approvals.filter((v) => v.automation_id === selectedId)} onClose={() => setSelectedId("")} onChanged={() => void load(true)} />}
    </div>
  );
}

type Action = "pause" | "resume" | "activate" | "run" | "reschedule" | "duplicate" | "archive" | "cancel";

const ACTION_LABELS: Record<Action, { label: string; icon: ReactNode; danger?: boolean }> = {
  pause: { label: "Mettre en pause", icon: <Pause className="h-4 w-4" /> },
  resume: { label: "Reprendre", icon: <Play className="h-4 w-4" /> },
  activate: { label: "Activer", icon: <Play className="h-4 w-4" /> },
  run: { label: "Exécuter maintenant", icon: <Zap className="h-4 w-4" /> },
  reschedule: { label: "Changer l’horaire", icon: <CalendarClock className="h-4 w-4" /> },
  duplicate: { label: "Dupliquer", icon: <Copy className="h-4 w-4" /> },
  archive: { label: "Archiver", icon: <Archive className="h-4 w-4" /> },
  cancel: { label: "Annuler l’automatisation", icon: <Trash2 className="h-4 w-4" />, danger: true },
};

function actionsFor(a: Automation): Action[] {
  const timed = ["exact_time", "flexible_time", "recurrence"].includes(String(a.trigger?.kind));
  switch (a.status) {
    case "active": return ["pause", "run", ...(timed ? ["reschedule" as Action] : []), "duplicate", "archive", "cancel"];
    case "paused": return ["resume", ...(timed ? ["reschedule" as Action] : []), "duplicate", "archive", "cancel"];
    case "draft":
    case "awaiting_confirmation": return ["activate", ...(timed ? ["reschedule" as Action] : []), "cancel"];
    default: return ["duplicate"];
  }
}

function toLocalInput(value?: string | null) {
  const d = value ? new Date(value) : new Date(Date.now() + 3_600_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Date locale saisie → ISO avec décalage explicite (jamais une heure nue). */
function withOffset(local: string) {
  const d = new Date(local);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${local}:00${sign}${hh}:${mm}`;
}

function DetailPanel({ id, online, approvals, onClose, onChanged }: { id: string; online: boolean; approvals: AutomationApproval[]; onClose: () => void; onChanged: () => void }) {
  const [a, setA] = useState<Automation | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<Action | "">("");
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "run" | "">("");
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const [runKey, setRunKey] = useState("");

  const reload = useCallback(async () => {
    try { setA(await getAutomation(id)); setErr(""); } catch (e) { setErr(serverMessage(e, "Automatisation indisponible.")); }
  }, [id]);
  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);

  const act = async (action: Action) => {
    if (!a || busy) return;
    setMenu(false);
    if ((action === "cancel" || action === "run") && confirm !== action) { setConfirm(action); return; }
    if (action === "reschedule" && !editing) {
      setWhen(toLocalInput(String(a.trigger?.at ?? a.next_run_at ?? "")));
      setEditing(true);
      return;
    }
    setConfirm("");
    setBusy(action);
    setErr("");
    try {
      if (action === "pause") await pauseAutomation(a.id);
      if (action === "resume" || action === "activate") await activateAutomation(a.id);
      if (action === "archive") await archiveAutomation(a.id);
      if (action === "cancel") await cancelAutomation(a.id);
      if (action === "duplicate") await duplicateAutomation(a.id);
      if (action === "run") {
        const key = runKey || newRequestId("web-run");
        setRunKey(key);
        await runAutomationNow(a.id, key);
        setRunKey("");
      }
      if (action === "reschedule") {
        const t = { ...a.trigger };
        if (t.kind === "recurrence") {
          const parts = String(t.cron ?? "").split(/\s+/);
          const [hh, mm] = when.slice(11, 16).split(":");
          if (parts.length === 5) { parts[0] = String(Number(mm)); parts[1] = String(Number(hh)); t.cron = parts.join(" "); }
        } else {
          if (new Date(when) <= new Date()) throw new Error("past");
          t.kind = t.kind === "flexible_time" ? "flexible_time" : "exact_time";
          t.at = withOffset(when);
        }
        await updateAutomationTrigger(a.id, t);
        setEditing(false);
      }
      await reload();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error && e.message === "past" ? "Cette heure est déjà passée." : serverMessage(e, "L’action n’a pas été appliquée."));
    } finally {
      setBusy("");
    }
  };

  const actions = a ? actionsFor(a) : [];
  const primary = actions[0];
  const wa = a ? viaWhatsApp(a) : false;
  const lastBad = a?.runs?.[0] && ["failed", "timed_out", "ambiguous"].includes(a.runs[0].status) ? a.runs[0] : null;

  return <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
    <aside className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[var(--cx-border-default)] bg-[var(--cx-surface)] shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--cx-border-subtle)] p-5">
        <div className="min-w-0">
          <h2 id="detail-title" className="truncate text-xl font-semibold text-[var(--cx-text-primary)]">{a?.name ?? "Automatisation"}</h2>
          {a && <div className="mt-2 flex flex-wrap items-center gap-2"><Pill {...automationStatus(a)} /><span className="text-sm text-[var(--cx-text-muted)]">{scheduleLabel(a)}</span></div>}
        </div>
        <div className="relative flex items-center gap-1">
          {actions.length > 1 && <button disabled={!online || !!busy} onClick={() => setMenu((m) => !m)} className="rounded-lg p-2 hover:bg-[var(--cx-hover)] disabled:opacity-50" aria-label="Plus d'actions"><MoreHorizontal className="h-5 w-5" /></button>}
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--cx-hover)]" aria-label="Fermer"><X className="h-5 w-5" /></button>
          {menu && <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] p-1.5 shadow-xl">{actions.slice(1).map((item) => <button key={item} onClick={() => void act(item)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--cx-hover)] ${ACTION_LABELS[item].danger ? "text-red-600" : "text-[var(--cx-text-secondary)]"}`}>{ACTION_LABELS[item].icon}{ACTION_LABELS[item].label}</button>)}</div>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {!a && !err && <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-[var(--cx-text-faint)]" /></div>}
        {err && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {a && <>
          {approvals.map((v) => <div key={v.id} className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Validation requise · {v.step_name}</p>{v.reason && <p className="mt-1">{v.reason}</p>}<div className="mt-3 flex justify-end gap-2"><button onClick={() => void decideApproval(v.id, false).then(onChanged)} className="rounded-lg px-3 py-1.5 font-semibold hover:bg-amber-100">Refuser</button><button onClick={() => void decideApproval(v.id, true).then(onChanged)} className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white">Autoriser</button></div></div>)}
          {lastBad && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage(lastBad.error, lastBad.error_category, lastBad.status)}</div>}

          {confirm && <div className="mb-4 rounded-xl border border-[var(--cx-border-default)] p-4 text-sm"><p className="font-semibold text-[var(--cx-text-primary)]">{confirm === "cancel" ? "Annuler cette automatisation ?" : "Exécuter maintenant ?"}</p><p className="mt-1 text-[var(--cx-text-muted)]">{confirm === "cancel" ? "Elle ne s’exécutera plus et ne pourra pas être réactivée." : `L’action part tout de suite vers ${a.recipient ?? "WhatsApp"}.`}</p><div className="mt-3 flex justify-end gap-2"><button onClick={() => setConfirm("")} className="rounded-lg px-3 py-1.5 font-semibold text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]">Garder</button><button onClick={() => void act(confirm)} className={`rounded-lg px-3 py-1.5 font-semibold text-white ${confirm === "cancel" ? "bg-red-600" : "bg-[var(--cx-accent)]"}`}>{confirm === "cancel" ? "Annuler l’automatisation" : "Exécuter"}</button></div></div>}

          {editing && <div className="mb-4 rounded-xl border border-[var(--cx-border-default)] p-4 text-sm"><label className="block text-xs font-semibold text-[var(--cx-text-secondary)]">{a.trigger?.kind === "recurrence" ? "Nouvelle heure" : "Nouvelle date et heure"}<input type={a.trigger?.kind === "recurrence" ? "time" : "datetime-local"} value={a.trigger?.kind === "recurrence" ? when.slice(11, 16) : when} onChange={(e) => setWhen(a.trigger?.kind === "recurrence" ? `${when.slice(0, 11)}${e.target.value}` : e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 outline-none focus:border-[var(--cx-accent)]" /></label><div className="mt-3 flex justify-end gap-2"><button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 font-semibold text-[var(--cx-text-muted)] hover:bg-[var(--cx-hover)]">Fermer</button><button disabled={!!busy} onClick={() => void act("reschedule")} className="rounded-lg bg-[var(--cx-accent)] px-3 py-1.5 font-semibold text-white disabled:opacity-50">Enregistrer</button></div></div>}

          {primary && <button disabled={!online || !!busy} onClick={() => void act(primary)} className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--cx-text-primary)] text-sm font-semibold text-[var(--background)] disabled:opacity-50">{busy === primary ? <LoaderCircle className="h-4 w-4 animate-spin" /> : ACTION_LABELS[primary].icon}{ACTION_LABELS[primary].label}</button>}

          <dl className="grid gap-4 rounded-2xl bg-[var(--cx-hover-row)] p-4 text-sm">
            <Detail label="Action" value={contentLabel(a.media_type, a.source_kind)} extra={contentPreview(a)} />
            {a.recipient && <Detail label="Destinataire" value={a.recipient} extra="WhatsApp" />}
            <Detail label="Prochaine exécution" value={a.next_run_at ? formatWhen(a.next_run_at) : "Aucune"} extra={a.trigger?.timezone ? `Fuseau : ${a.trigger.timezone}` : undefined} />
            {a.original_request && <Detail label="Demande d’origine" value={`« ${a.original_request} »`} />}
            {a.created_at && <Detail label="Créée" value={formatWhen(a.created_at)} />}
          </dl>

          <section className="mt-7" aria-labelledby="history-title">
            <h3 id="history-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--cx-text-primary)]"><History className="h-4 w-4" />Historique</h3>
            {!a.runs?.length ? <p className="mt-3 text-sm text-[var(--cx-text-muted)]">Aucune exécution pour le moment.</p> : <ol className="mt-3 divide-y divide-[var(--cx-border-subtle)] rounded-xl border border-[var(--cx-border-subtle)]">{a.runs.slice(0, 20).map((r) => { const st = runStatus(r.status, wa); const bad = ["failed", "timed_out", "ambiguous", "cancelled"].includes(r.status) && (r.error || r.error_category); return <li key={r.id} className="p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-[var(--cx-text-secondary)]">{formatWhen(r.finished_at || r.started_at || r.scheduled_for) || "—"}</span><Pill {...st} /></div>{bad && <p className="mt-1 text-xs text-[var(--cx-text-muted)]">{errorMessage(r.error, r.error_category, r.status)}</p>}</li>; })}</ol>}
            {wa && a.runs?.some((r) => r.status === "succeeded") && <p className="mt-2 text-xs text-[var(--cx-text-faint)]">« Acceptée » : WhatsApp a pris l’envoi en charge. La réception par le destinataire n’est pas confirmée.</p>}
          </section>
        </>}
      </div>
    </aside>
  </div>;
}

function Detail({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return <div><dt className="text-xs text-[var(--cx-text-faint)]">{label}</dt><dd className="mt-1 break-words font-medium text-[var(--cx-text-secondary)]">{value}</dd>{extra && <dd className="mt-0.5 break-words text-xs text-[var(--cx-text-muted)]">{extra}</dd>}</div>;
}
